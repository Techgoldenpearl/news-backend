import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import {
  rashifal, webStories, photoGalleries, galleryImages,
  liveBlogs, liveBlogEntries, topics, topicFollows, articleTopics,
  states, cities, authors, articleReactions, readingHistory,
  utilityData, bookmarks, comments, articles, categories, tags,
  notificationPreferences, pushSubscriptions, users,
} from "../../drizzle/schema.js";
import { eq, and, or, desc, asc, sql, inArray, ilike, count } from "drizzle-orm";
import { requireAuth, requireEditor, optionalAuth } from "../middleware/auth.js";
import { parsePagination, sanitizeForLike } from "../utils/helpers.js";

const router = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RASHIFAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/rashifal/:rashi", async (req: Request, res: Response) => {
  try {
    const { rashi } = req.params;
    const period = (req.query.period as string) || "daily";
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const [result] = await db.select().from(rashifal)
      .where(and(eq(rashifal.rashi, rashi as any), eq(rashifal.period, period as any), eq(rashifal.date, date)))
      .limit(1);

    res.json(result ?? { rashi, period, date, content: "आज का राशिफल जल्द ही उपलब्ध होगा।", score: 7 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rashifal" });
  }
});

router.get("/rashifal", async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || "daily";
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const results = await db.select().from(rashifal)
      .where(and(eq(rashifal.period, period as any), eq(rashifal.date, date)));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rashifal" });
  }
});

router.post("/rashifal", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.insert(rashifal).values(req.body).onConflictDoUpdate({
      target: [rashifal.rashi, rashifal.date],
      set: req.body,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save rashifal" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEB STORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/web-stories", async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;

    const conditions: any[] = [eq(webStories.status, "published")];
    if (siteId) conditions.push(eq(webStories.siteId, siteId));

    const items = await db.select({
      id: webStories.id, title: webStories.title, titleHindi: webStories.titleHindi, slug: webStories.slug,
      thumbnailUrl: webStories.thumbnailUrl, viewsCount: webStories.viewsCount,
      publishedAt: webStories.publishedAt, categoryName: categories.name,
    })
      .from(webStories)
      .leftJoin(categories, eq(webStories.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(webStories.publishedAt))
      .limit(limit).offset(offset);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch web stories" });
  }
});

router.get("/web-stories/:slug", async (req: Request, res: Response) => {
  try {
    const [story] = await db.select().from(webStories)
      .where(and(eq(webStories.slug, req.params.slug), eq(webStories.status, "published")))
      .limit(1);
    if (!story) return res.status(404).json({ error: "Story not found" });

    db.update(webStories).set({ viewsCount: sql`${webStories.viewsCount} + 1` })
      .where(eq(webStories.id, story.id)).then(() => {}).catch(() => {});

    res.json(story);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

router.post("/web-stories", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const publishedAt = req.body.status === "published" ? new Date() : null;
    const [story] = await db.insert(webStories).values({ ...req.body, publishedAt }).returning();
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ error: "Failed to create story" });
  }
});

router.put("/web-stories/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const extra: any = {};
    if (req.body.status === "published") extra.publishedAt = new Date();
    await db.update(webStories).set({ ...req.body, ...extra, updatedAt: new Date() })
      .where(eq(webStories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update story" });
  }
});

router.delete("/web-stories/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.delete(webStories).where(eq(webStories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete story" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHOTO GALLERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/photo-galleries", async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;

    const conditions: any[] = [eq(photoGalleries.status, "published")];
    if (siteId) conditions.push(eq(photoGalleries.siteId, siteId));

    const items = await db.select({
      id: photoGalleries.id, title: photoGalleries.title, titleHindi: photoGalleries.titleHindi, slug: photoGalleries.slug,
      thumbnailUrl: photoGalleries.thumbnailUrl, viewsCount: photoGalleries.viewsCount,
      publishedAt: photoGalleries.publishedAt, categoryName: categories.name,
      imageCount: sql<number>`(SELECT COUNT(*) FROM ${galleryImages} WHERE ${galleryImages.galleryId} = ${photoGalleries.id})`,
    })
      .from(photoGalleries)
      .leftJoin(categories, eq(photoGalleries.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(photoGalleries.publishedAt))
      .limit(limit).offset(offset);
    res.json(items.map((i) => ({ ...i, imageCount: Number(i.imageCount) })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch galleries" });
  }
});

router.get("/photo-galleries/:slug", async (req: Request, res: Response) => {
  try {
    const [gallery] = await db.select().from(photoGalleries)
      .where(and(eq(photoGalleries.slug, req.params.slug), eq(photoGalleries.status, "published")))
      .limit(1);
    if (!gallery) return res.status(404).json({ error: "Gallery not found" });

    const images = await db.select().from(galleryImages)
      .where(eq(galleryImages.galleryId, gallery.id))
      .orderBy(asc(galleryImages.sortOrder));

    res.json({ ...gallery, images });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

router.post("/photo-galleries", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { images, ...galleryData } = req.body;
    const publishedAt = galleryData.status === "published" ? new Date() : null;
    const [gallery] = await db.insert(photoGalleries).values({ ...galleryData, publishedAt }).returning();
    if (images?.length) {
      await db.insert(galleryImages).values(images.map((img: any) => ({ ...img, galleryId: gallery.id })));
    }
    res.status(201).json(gallery);
  } catch (err) {
    res.status(500).json({ error: "Failed to create gallery" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE BLOGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/live-blogs/:articleId", async (req: Request, res: Response) => {
  try {
    const [blog] = await db.select().from(liveBlogs)
      .where(eq(liveBlogs.articleId, parseInt(req.params.articleId))).limit(1);
    if (!blog) return res.json(null);

    const entries = await db.select().from(liveBlogEntries)
      .where(eq(liveBlogEntries.liveBlogId, blog.id))
      .orderBy(desc(liveBlogEntries.postedAt)).limit(50);

    res.json({ ...blog, entries });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch live blog" });
  }
});

router.post("/live-blogs", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const [blog] = await db.insert(liveBlogs).values({ articleId: req.body.articleId, isLive: true }).returning();
    res.status(201).json(blog);
  } catch (err) {
    res.status(500).json({ error: "Failed to create live blog" });
  }
});

router.post("/live-blogs/:id/entries", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.insert(liveBlogEntries).values({ ...req.body, liveBlogId: parseInt(req.params.id), postedAt: new Date() });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add entry" });
  }
});

router.patch("/live-blogs/:id/toggle", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.update(liveBlogs).set({
      isLive: req.body.isLive, endedAt: req.body.isLive ? null : new Date(),
    }).where(eq(liveBlogs.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle live blog" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPICS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/topics", async (req: Request, res: Response) => {
  try {
    const trending = req.query.trending === "true";
    const conditions: any[] = trending ? [eq(topics.isTrending, true)] : [];
    const items = await db.select().from(topics)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(topics.articlesCount)).limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

router.get("/topics/:slug", async (req: Request, res: Response) => {
  try {
    const [topic] = await db.select().from(topics).where(eq(topics.slug, req.params.slug)).limit(1);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const { limit, offset } = parsePagination(req.query);
    const topicArticles = await db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      summary: articles.summary, thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt, categoryName: categories.name,
    })
      .from(articleTopics)
      .innerJoin(articles, eq(articleTopics.articleId, articles.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(eq(articleTopics.topicId, topic.id), eq(articles.status, "published")))
      .orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);

    res.json({ topic, articles: topicArticles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch topic" });
  }
});

router.post("/topics/:topicId/follow", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const topicId = parseInt(req.params.topicId);
    const [existing] = await db.select().from(topicFollows)
      .where(and(eq(topicFollows.userId, user.id), eq(topicFollows.topicId, topicId))).limit(1);

    if (existing) {
      await db.delete(topicFollows).where(eq(topicFollows.id, existing.id));
      await db.update(topics).set({ followersCount: sql`${topics.followersCount} - 1` }).where(eq(topics.id, topicId));
      return res.json({ following: false });
    }
    await db.insert(topicFollows).values({ userId: user.id, topicId });
    await db.update(topics).set({ followersCount: sql`${topics.followersCount} + 1` }).where(eq(topics.id, topicId));
    res.json({ following: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATES & CITIES (Location-based news)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/locations/states", async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(states).where(eq(states.isActive, true)).orderBy(asc(states.sortOrder));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

router.get("/locations/states/:slug/cities", async (req: Request, res: Response) => {
  try {
    const [state] = await db.select().from(states).where(eq(states.slug, req.params.slug)).limit(1);
    if (!state) return res.status(404).json({ error: "State not found" });
    const citiesList = await db.select().from(cities)
      .where(and(eq(cities.stateId, state.id), eq(cities.isActive, true)))
      .orderBy(asc(cities.sortOrder));
    res.json({ state, cities: citiesList });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

router.get("/locations/states/:slug/articles", async (req: Request, res: Response) => {
  try {
    const [state] = await db.select().from(states).where(eq(states.slug, req.params.slug)).limit(1);
    if (!state) return res.status(404).json({ error: "State not found" });

    const { limit, offset } = parsePagination(req.query);
    const items = await db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      summary: articles.summary, thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt, isBreaking: articles.isBreaking,
      categoryName: categories.name,
    })
      .from(articles).leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(eq(articles.status, "published"), eq(articles.state, state.name)))
      .orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);

    res.json({ state, articles: items });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTHORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/authors", async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(authors).where(eq(authors.isActive, true))
      .orderBy(desc(authors.articlesCount)).limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch authors" });
  }
});

router.get("/authors/:slug", async (req: Request, res: Response) => {
  try {
    const [author] = await db.select().from(authors).where(eq(authors.slug, req.params.slug)).limit(1);
    if (!author) return res.status(404).json({ error: "Author not found" });

    const { limit, offset } = parsePagination(req.query);
    const authorArticles = await db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      summary: articles.summary, thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt, categoryName: categories.name,
    })
      .from(articles).leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(eq(articles.authorId, author.id), eq(articles.status, "published")))
      .orderBy(desc(articles.publishedAt)).limit(limit).offset(offset);

    res.json({ author, articles: authorArticles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch author" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACTIONS, BOOKMARKS, COMMENTS, READING HISTORY, SEARCH, UTILITY, NOTIF PREFS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Reactions
router.post("/reactions", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { articleId, reaction } = req.body;
    const [existing] = await db.select().from(articleReactions)
      .where(and(eq(articleReactions.articleId, articleId), eq(articleReactions.userId, user.id))).limit(1);

    if (existing) {
      if (existing.reaction === reaction) {
        await db.delete(articleReactions).where(eq(articleReactions.id, existing.id));
        return res.json({ action: "removed" });
      }
      await db.update(articleReactions).set({ reaction }).where(eq(articleReactions.id, existing.id));
      return res.json({ action: "changed", reaction });
    }
    await db.insert(articleReactions).values({ articleId, userId: user.id, reaction });
    res.json({ action: "added", reaction });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle reaction" });
  }
});

router.get("/reactions/:articleId", async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const results = await db.select({
      reaction: articleReactions.reaction, count: sql<number>`COUNT(*)`,
    }).from(articleReactions).where(eq(articleReactions.articleId, articleId)).groupBy(articleReactions.reaction);
    const counts: Record<string, number> = { helpful: 0, not_helpful: 0, love: 0, angry: 0, sad: 0 };
    results.forEach(r => { counts[r.reaction] = Number(r.count); });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Bookmarks
router.get("/bookmarks", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      thumbnailUrl: articles.thumbnailUrl, publishedAt: articles.publishedAt,
      categoryName: categories.name,
    })
      .from(bookmarks)
      .innerJoin(articles, eq(bookmarks.articleId, articles.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(bookmarks.userId, user.id))
      .orderBy(desc(bookmarks.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.post("/bookmarks", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.insert(bookmarks).values({ userId: user.id, articleId: req.body.articleId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

router.delete("/bookmarks/:articleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.delete(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.articleId, parseInt(req.params.articleId))));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});

// Comments
router.get("/comments/:articleId", async (req: Request, res: Response) => {
  try {
    const items = await db.select({
      id: comments.id, content: comments.content, parentId: comments.parentId,
      createdAt: comments.createdAt, userName: users.name, avatarUrl: users.avatarUrl,
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.articleId, parseInt(req.params.articleId)), eq(comments.status, "approved")))
      .orderBy(desc(comments.createdAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/comments", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await db.insert(comments).values({
      articleId: req.body.articleId, userId: user.id,
      content: req.body.content, parentId: req.body.parentId,
    });
    res.json({ success: true, message: "Comment submitted for moderation" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Reading History
router.get("/reading-history", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await db.select({
      id: readingHistory.id, readAt: readingHistory.readAt,
      articleId: articles.id, title: articles.title, slug: articles.slug,
      thumbnailUrl: articles.thumbnailUrl, categoryName: categories.name,
    })
      .from(readingHistory)
      .innerJoin(articles, eq(readingHistory.articleId, articles.id))
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(readingHistory.userId, user.id))
      .orderBy(desc(readingHistory.readAt)).limit(30);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reading history" });
  }
});

router.post("/reading-history", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { articleId, readDurationSeconds } = req.body;
    const [existing] = await db.select().from(readingHistory)
      .where(and(eq(readingHistory.userId, user.id), eq(readingHistory.articleId, articleId))).limit(1);

    if (existing) {
      await db.update(readingHistory).set({ readAt: new Date(), readDurationSeconds }).where(eq(readingHistory.id, existing.id));
    } else {
      await db.insert(readingHistory).values({ userId: user.id, articleId, readDurationSeconds });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save reading history" });
  }
});

// Search (full-text with PostgreSQL tsvector, fallback to ILIKE)
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || "";
    if (query.length < 2) return res.json({ items: [], total: 0 });

    const { limit, offset } = parsePagination(req.query);
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;

    try {
      const { fullTextSearch } = await import("../utils/search.js");
      const results = await fullTextSearch(query, limit, offset, siteId);
      if (results.total > 0 || results.items.length > 0) return res.json(results);
    } catch (err) {
      console.warn("[Search] Full-text search failed, falling back to ILIKE:", (err as any).message);
    }

    const conditions: any[] = [eq(articles.status, "published"), ilike(articles.title, `%${sanitizeForLike(query as string)}%`)];
    if (siteId) conditions.push(or(eq(articles.siteId, siteId), eq(articles.isGlobal, true)));

    const results = await db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      summary: articles.summary, thumbnailUrl: articles.thumbnailUrl,
      publishedAt: articles.publishedAt,
      categoryName: categories.name, categorySlug: categories.slug,
    })
      .from(articles).leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(articles.viewsCount)).limit(limit).offset(offset);
    res.json({ items: results, total: results.length });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Utility Data
router.get("/utility-data", async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(utilityData).orderBy(desc(utilityData.updatedAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch utility data" });
  }
});

// Tags
router.get("/tags", async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(tags).orderBy(tags.name);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

router.post("/tags", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const [tag] = await db.insert(tags).values(req.body).returning();
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

// Notification Preferences
router.get("/notification-prefs", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [prefs] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id)).limit(1);
    res.json(prefs ?? { breakingNews: true, sports: false, entertainment: false, politics: false, business: false, technology: false, rashifal: false, localNews: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.put("/notification-prefs", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [existing] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id)).limit(1);

    if (existing) {
      await db.update(notificationPreferences).set(req.body).where(eq(notificationPreferences.userId, user.id));
    } else {
      await db.insert(notificationPreferences).values({ userId: user.id, ...req.body });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Push Subscriptions
router.post("/push-subscribe", optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id ?? null;
    await db.insert(pushSubscriptions).values({ ...req.body, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
