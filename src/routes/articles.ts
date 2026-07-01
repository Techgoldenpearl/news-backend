import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { articles, categories, articleTags, tags, articleMedia } from "../../drizzle/schema.js";
import { eq, and, desc, sql, or, ilike, count, gte } from "drizzle-orm";
import { requireAuth, requireEditor, optionalAuth } from "../middleware/auth.js";
import { parsePagination, sanitizeForLike } from "../utils/helpers.js";
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
    const { categorySlug, categoryId, isBreaking, isTrending, isFeatured, contentType, state, city, search, siteId } = req.query as any;

    const resolvedSiteId = siteId ? parseInt(siteId) : (req as any).site?.id;

    const conditions: any[] = [eq(articles.status, "published")];

    if (resolvedSiteId) conditions.push(or(eq(articles.siteId, resolvedSiteId), eq(articles.isGlobal, true)));

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
      if (resolvedSiteId) categoryConditions.push(eq(categories.siteId, resolvedSiteId));
      const [cat] = await db.select({ id: categories.id }).from(categories).where(and(...categoryConditions)).limit(1);
      if (cat) conditions.push(eq(articles.categoryId, cat.id));
      else conditions.push(sql`false`);
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
          categorySlug: categories.slug,
          categoryColor: categories.color,
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(articles.publishedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(articles)
        .where(and(...conditions)),
    ]);

    res.json({
      items,
      total: Number(total?.c ?? 0),
      hasMore: offset + items.length < Number(total?.c ?? 0),
    });
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
        })
        .from(articles)
        .leftJoin(categories, eq(articles.categoryId, categories.id))
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
router.get("/:slug", optionalAuth, async (req: Request, res: Response) => {
  try {
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

    const [category, articleTagsList, media] = await Promise.all([
      db.select().from(categories).where(eq(categories.id, article.categoryId)).limit(1),
      db
        .select({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(articleTags)
        .innerJoin(tags, eq(articleTags.tagId, tags.id))
        .where(eq(articleTags.articleId, article.id)),
      db.select().from(articleMedia).where(eq(articleMedia.articleId, article.id)),
    ]);

    // Increment views async
    db.update(articles)
      .set({ viewsCount: sql`${articles.viewsCount} + 1` })
      .where(eq(articles.id, article.id))
      .then(() => {})
      .catch(() => {});

    const { ...safeArticle } = article;
    res.json({
      ...safeArticle,
      category: category[0] ?? null,
      tags: articleTagsList,
      media,
    });
  } catch (err) {
    console.error("[Articles] Detail error:", err);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// POST /api/articles — create article (editor+)
router.post("/", requireAuth, requireEditor, validateBody(articleCreateSchema), auditAction("article.create", "article"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { tagIds, ...articleData } = req.body;

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
    const { tagIds, ...data } = req.body;

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

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update article" });
  }
});

// DELETE /api/articles/:id (editor+)
router.delete("/:id", requireAuth, requireEditor, auditAction("article.delete", "article"), async (req: Request, res: Response) => {
  try {
    await db.delete(articles).where(eq(articles.id, parseInt(req.params.id)));
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

export default router;
