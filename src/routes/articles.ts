import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { articles, categories, articleTags, tags, articleMedia, sites, articleWebsites, articleLocations, states, cities } from "../../drizzle/schema.js";
import { eq, and, desc, asc, sql, or, ilike, count, gte } from "drizzle-orm";
import { requireAuth, requireEditor, optionalAuth } from "../middleware/auth.js";
import { parsePagination, sanitizeForLike, articleMatchesSite, categoryMatchesSite } from "../utils/helpers.js";
import { articleCreateSchema, articleUpdateSchema } from "../validations/index.js";
import { validateBody } from "../middleware/validate.js";
import { cacheGet, cacheSet, cacheDel, TTL } from "../config/redis.js";
import { sanitizeHtml } from "../utils/sanitize.js";
import { auditAction } from "../middleware/auditLog.js";

const router = Router();

// GET /api/articles — public list with filters
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { categorySlug, categoryId, isBreaking, isTrending, isFeatured, contentType, state, city, search, siteId, sort } = req.query as any;

    const resolvedSiteId = siteId ? parseInt(siteId) : (req as any).site?.id;

    const conditions: any[] = [eq(articles.status, "published")];

    if (resolvedSiteId) conditions.push(articleMatchesSite(resolvedSiteId));

    if (categoryId) conditions.push(eq(articles.categoryId, parseInt(categoryId)));
    if (isBreaking === "true") conditions.push(eq(articles.isBreaking, true));
    if (isTrending === "true") conditions.push(eq(articles.isTrending, true));
    if (isFeatured === "true") conditions.push(eq(articles.isFeatured, true));
    if (contentType) conditions.push(eq(articles.contentType, contentType));
    if (state) conditions.push(eq(articles.state, state));
    if (city) conditions.push(eq(articles.city, city));
    if (search) conditions.push(ilike(articles.title, `%${sanitizeForLike(search as string)}%`));

    if (categorySlug) {
      const categoryConditions = [eq(categories.slug, categorySlug)];
      if (resolvedSiteId) categoryConditions.push(categoryMatchesSite(resolvedSiteId));
      const [cat] = await db.select({ id: categories.id }).from(categories).where(and(...categoryConditions)).limit(1);
      if (cat) conditions.push(eq(articles.categoryId, cat.id));
      else conditions.push(sql`false`);
    }

    // Public, unauthenticated reads are the vast majority of traffic and are
    // identical across requests for the same query params — cache them.
    const isCacheable = !(req as any).user;
    const cacheKey = isCacheable ? `articles:list:${resolvedSiteId ?? "all"}:${JSON.stringify(req.query)}` : null;
    if (cacheKey) {
      const cached = await cacheGet<{ items: unknown[]; total: number; hasMore: boolean }>(cacheKey);
      if (cached) {
        res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        return res.json(cached);
      }
    }

    const [items, [total]] = await Promise.all([
      db
        .select({
          id: articles.id,
          siteId: articles.siteId,
          title: articles.title,
          titleHindi: articles.titleHindi,
          slug: articles.slug,
          summary: articles.summary,
          thumbnailUrl: articles.thumbnailUrl,
          videoUrl: articles.videoUrl,
          videoType: articles.videoType,
          contentType: articles.contentType,
          isBreaking: articles.isBreaking,
          isTrending: articles.isTrending,
          isFeatured: articles.isFeatured,
          isPremium: articles.isPremium,
          viewsCount: articles.viewsCount,
          readTimeMinutes: articles.readTimeMinutes,
          publishedAt: articles.publishedAt,
          categoryName: categories.name,
          categoryNameHindi: categories.nameHindi,
          categorySlug: categories.slug,
          categoryColor: categories.color,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(
          sort === "views" ? desc(articles.viewsCount)
            : sort === "oldest" ? asc(articles.publishedAt)
            : desc(articles.publishedAt)
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(articles)
        .where(and(...conditions)),
    ]);

    const payload = {
      items,
      total: Number(total?.c ?? 0),
      hasMore: offset + items.length < Number(total?.c ?? 0),
    };

    if (cacheKey) {
      cacheSet(cacheKey, payload, TTL.SHORT).catch(() => {});
      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    }

    res.json(payload);
  } catch (err) {
    console.error("[Articles] List error:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// GET /api/articles/admin/list — admin list (any status)
router.get("/admin/list", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { status, categoryId, search } = req.query as any;

    const conditions: any[] = [];
    if (status) conditions.push(eq(articles.status, status));
    if (categoryId) conditions.push(eq(articles.categoryId, parseInt(categoryId)));
    if (search) conditions.push(ilike(articles.title, `%${sanitizeForLike(search as string)}%`));

    const [items, [total]] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          status: articles.status,
          contentType: articles.contentType,
          isBreaking: articles.isBreaking,
          isTrending: articles.isTrending,
          isFeatured: articles.isFeatured,
          isPremium: articles.isPremium,
          viewsCount: articles.viewsCount,
          publishedAt: articles.publishedAt,
          createdAt: articles.createdAt,
          categoryName: categories.name,
          siteId: articles.siteId,
          siteName: sites.name,
          siteNames: sql<string | null>`(
            select string_agg(${sites.name}, ', ')
            from ${articleWebsites}
            join ${sites} on ${sites.id} = ${articleWebsites.siteId}
            where ${articleWebsites.articleId} = ${articles.id}
          )`,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .leftJoin(sites, eq(articles.siteId, sites.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(articles.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(articles)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// GET /api/articles/:slug — public article detail
// Note: intentionally NOT scoped by site — an article's permalink must always
// resolve regardless of which site is currently active in the visitor's
// browser/session (e.g. after switching sites, or opening an old bookmarked/
// shared link). Site-scoping still applies to listings, search, and feeds.
router.get("/:slug", optionalAuth, async (req: Request, res: Response) => {
  try {
    // The article page fetches this route twice — once server-side (for
    // generateMetadata/JSON-LD, on every request including bots and social
    // link-preview crawlers) and once client-side (the actual visitor's
    // browser rendering the page). Only the latter should count as a real
    // view; the server-side SEO fetch passes noCount=1 to opt out.
    const shouldCountView = req.query.noCount !== "1";

    const isAnonymous = !(req as any).user;
    const detailCacheKey = isAnonymous ? `articles:detail:${req.params.slug}` : null;
    if (detailCacheKey) {
      const cached = await cacheGet<Record<string, unknown>>(detailCacheKey);
      if (cached) {
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        if (shouldCountView) {
          db.update(articles)
            .set({ viewsCount: sql`${articles.viewsCount} + 1` })
            .where(eq(articles.slug, req.params.slug))
            .then(() => {})
            .catch(() => {});
        }
        return res.json(cached);
      }
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, req.params.slug))
      .limit(1);

    if (!article) return res.status(404).json({ error: "Article not found" });

    // If premium, check subscription
    if (article.isPremium) {
      const user = (req as any).user;
      const isStaff = user && ["editor", "admin", "super_admin"].includes(user.role);

      if (!isStaff) {
        let hasSubscription = false;
        if (user) {
          const { userSubscriptions } = await import("../../drizzle/schema.js");
          const [sub] = await db
            .select()
            .from(userSubscriptions)
            .where(and(eq(userSubscriptions.userId, user.id), eq(userSubscriptions.status, "active"), gte(userSubscriptions.endDate, new Date())))
            .limit(1);
          hasSubscription = !!sub;
        }

        if (!hasSubscription) {
          const truncated = (article.content || "").slice(0, 500) + "...";
          const { content: _, ...meta } = article;
          const [category] = await db.select().from(categories).where(eq(categories.id, article.categoryId)).limit(1);
          return res.json({
            ...meta,
            content: truncated,
            isPremiumLocked: true,
            category: category ?? null,
            tags: [],
            media: [],
          });
        }
      }
    }

    const [category, articleTagsList, media, siteLinks, locationLinks] = await Promise.all([
      db.select().from(categories).where(eq(categories.id, article.categoryId)).limit(1),
      db
        .select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id)),
      db.select().from(articleMedia).where(eq(articleMedia.articleId, article.id)),
      db.select({ siteId: articleWebsites.siteId }).from(articleWebsites).where(eq(articleWebsites.articleId, article.id)),
      db
        .select({ stateId: articleLocations.stateId, cityId: articleLocations.cityId, stateName: states.name, cityName: cities.name })
        .from(articleLocations)
        .leftJoin(states, eq(articleLocations.stateId, states.id))
        .leftJoin(cities, eq(articleLocations.cityId, cities.id))
        .where(eq(articleLocations.articleId, article.id)),
    ]);

    // Increment views async (skipped for the server-side SEO-metadata fetch — see above)
    if (shouldCountView) {
      db.update(articles)
        .set({ viewsCount: sql`${articles.viewsCount} + 1` })
        .where(eq(articles.id, article.id))
        .then(() => {})
        .catch(() => {});
    }

    const { ...safeArticle } = article;
    const detailPayload = {
      ...safeArticle,
      category: category[0] ?? null,
      tags: articleTagsList,
      media,
      siteIds: siteLinks.map((s) => s.siteId),
      locationIds: locationLinks,
    };

    // Premium articles vary by subscription/auth state — never cache those.
    if (detailCacheKey && !article.isPremium) {
      cacheSet(detailCacheKey, detailPayload, TTL.MEDIUM).catch(() => {});
      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    }

    res.json(detailPayload);
  } catch (err) {
    console.error("[Articles] Detail error:", err);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// POST /api/articles — create article (editor+)
router.post("/", requireAuth, requireEditor, validateBody(articleCreateSchema), auditAction("article.create", "article"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { tagIds, siteIds, locationIds, ...articleData } = req.body;

    if (articleData.content) articleData.content = sanitizeHtml(articleData.content);

    const publishedAt =
      articleData.status === "published"
        ? articleData.publishedAt || new Date()
        : articleData.publishedAt || null;

    const [newArticle] = await db
      .insert(articles)
      .values({
        ...articleData,
        authorId: user.id,
        publishedAt,
      })
      .returning({ id: articles.id });

    if (tagIds?.length) {
      await db.insert(articleTags).values(
        tagIds.map((tagId: number) => ({
          articleId: newArticle.id,
          tagId,
        }))
      );
    }

    const resolvedSiteIds: number[] = siteIds?.length ? siteIds : (articleData.siteId ? [articleData.siteId] : []);
    if (resolvedSiteIds.length) {
      await db.insert(articleWebsites).values(
        resolvedSiteIds.map((siteId) => ({ articleId: newArticle.id, siteId }))
      );
    }

    if (locationIds?.length) {
      await db.insert(articleLocations).values(
        locationIds.map((loc: { stateId?: number; cityId?: number }) => ({
          articleId: newArticle.id,
          stateId: loc.stateId ?? null,
          cityId: loc.cityId ?? null,
        }))
      );
    }

    await cacheDel("articles:*");
    res.status(201).json({ success: true, id: newArticle.id });
  } catch (err) {
    console.error("[Articles] Create error:", err);
    res.status(500).json({ error: "Failed to create article" });
  }
});

// PUT /api/articles/:id — update article (editor+)
router.put("/:id", requireAuth, requireEditor, auditAction("article.update", "article"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { tagIds, siteIds, locationIds, ...data } = req.body;

    if (data.status === "published" && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    await db
      .update(articles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(articles.id, id));

    if (tagIds !== undefined) {
      await db.delete(articleTags).where(eq(articleTags.articleId, id));
      if (tagIds.length > 0) {
        await db.insert(articleTags).values(
          tagIds.map((tagId: number) => ({ articleId: id, tagId }))
        );
      }
    }

    if (siteIds !== undefined) {
      await db.delete(articleWebsites).where(eq(articleWebsites.articleId, id));
      if (siteIds.length > 0) {
        await db.insert(articleWebsites).values(
          siteIds.map((siteId: number) => ({ articleId: id, siteId }))
        );
      }
    }

    if (locationIds !== undefined) {
      await db.delete(articleLocations).where(eq(articleLocations.articleId, id));
      if (locationIds.length > 0) {
        await db.insert(articleLocations).values(
          locationIds.map((loc: { stateId?: number; cityId?: number }) => ({
            articleId: id,
            stateId: loc.stateId ?? null,
            cityId: loc.cityId ?? null,
          }))
        );
      }
    }

    await cacheDel("articles:*");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update article" });
  }
});

// DELETE /api/articles/:id (editor+)
router.delete("/:id", requireAuth, requireEditor, auditAction("article.delete", "article"), async (req: Request, res: Response) => {
  try {
    await db.delete(articles).where(eq(articles.id, parseInt(req.params.id)));
    await cacheDel("articles:*");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete article" });
  }
});

// PATCH /api/articles/:id/toggle-breaking
router.patch("/:id/toggle-breaking", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isBreaking } = req.body;
    await db.update(articles).set({ isBreaking }).where(eq(articles.id, id));

    if (isBreaking) {
      const [article] = await db.select({ title: articles.title, slug: articles.slug }).from(articles).where(eq(articles.id, id)).limit(1);
      if (article) {
        import("../utils/pushNotification.js").then(({ sendBreakingNewsAlert }) => {
          sendBreakingNewsAlert(article.title, article.slug).catch(() => {});
        });
      }
    }

    await cacheDel("articles:*");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle breaking" });
  }
});

// PATCH /api/articles/:id/toggle-trending
router.patch("/:id/toggle-trending", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isTrending } = req.body;
    await db.update(articles).set({ isTrending }).where(eq(articles.id, id));
    await cacheDel("articles:*");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle trending" });
  }
});

// PATCH /api/articles/:id/toggle-featured
router.patch("/:id/toggle-featured", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isFeatured } = req.body;
    await db.update(articles).set({ isFeatured }).where(eq(articles.id, id));
    await cacheDel("articles:*");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

export default router;
