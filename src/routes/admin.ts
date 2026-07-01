import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import {
  articles, users, reporters, reporterSubmissions,
  ads, advertiserAdRequests, auditLogs, comments,
  pageLayouts, userSubscriptions, membershipPlans,
} from "../../drizzle/schema.js";
import { eq, desc, and, like, or, count, sql, gte } from "drizzle-orm";
import { requireAuth, requireAdmin, requireSuperAdmin, requireEditor } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import { parsePagination, sanitizeForLike } from "../utils/helpers.js";

const router = Router();

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

router.get("/stats", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [totalArticles] = await db.select({ c: count() }).from(articles);
    const [publishedArticles] = await db.select({ c: count() }).from(articles).where(eq(articles.status, "published"));
    const [draftArticles] = await db.select({ c: count() }).from(articles).where(eq(articles.status, "draft"));
    const [breakingCount] = await db.select({ c: count() }).from(articles).where(eq(articles.isBreaking, true));
    const [trendingCount] = await db.select({ c: count() }).from(articles).where(eq(articles.isTrending, true));

    const [totalReporters] = await db.select({ c: count() }).from(reporters);
    const [activeReporters] = await db.select({ c: count() }).from(reporters).where(eq(reporters.status, "active"));
    const [pendingReporters] = await db.select({ c: count() }).from(reporters).where(eq(reporters.status, "pending"));
    const [pendingSubmissions] = await db.select({ c: count() }).from(reporterSubmissions).where(eq(reporterSubmissions.status, "pending"));

    const [activeAds] = await db.select({ c: count() }).from(ads).where(eq(ads.status, "active"));
    const [pendingAdRequests] = await db.select({ c: count() }).from(advertiserAdRequests).where(eq(advertiserAdRequests.status, "pending"));

    const [pendingComments] = await db.select({ c: count() }).from(comments).where(eq(comments.status, "pending"));

    const [activeSubscriptions] = await db.select({ c: count() }).from(userSubscriptions)
      .where(and(eq(userSubscriptions.status, "active"), gte(userSubscriptions.endDate, new Date())));

    const [totalUsers] = await db.select({ c: count() }).from(users);

    res.json({
      totalArticles: Number(totalArticles?.c ?? 0),
      publishedArticles: Number(publishedArticles?.c ?? 0),
      draftArticles: Number(draftArticles?.c ?? 0),
      breakingCount: Number(breakingCount?.c ?? 0),
      trendingCount: Number(trendingCount?.c ?? 0),
      totalReporters: Number(totalReporters?.c ?? 0),
      activeReporters: Number(activeReporters?.c ?? 0),
      pendingReporters: Number(pendingReporters?.c ?? 0),
      pendingSubmissions: Number(pendingSubmissions?.c ?? 0),
      activeAds: Number(activeAds?.c ?? 0),
      pendingAdRequests: Number(pendingAdRequests?.c ?? 0),
      pendingComments: Number(pendingComments?.c ?? 0),
      activeSubscriptions: Number(activeSubscriptions?.c ?? 0),
      totalUsers: Number(totalUsers?.c ?? 0),
    });
  } catch (err) {
    console.error("[Admin] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── USER MANAGEMENT ────────────────────────────────────────────────────────

router.get("/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { search, role } = req.query as any;

    const conditions: any[] = [];
    if (search) {
      const s = sanitizeForLike(search as string);
      conditions.push(or(like(users.name, `%${s}%`), like(users.email, `%${s}%`)));
    }
    if (role) conditions.push(eq(users.role, role));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        lastSignedIn: users.lastSignedIn,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ c: count() }).from(users).where(whereClause);
    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/users/:id/role", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    await db.update(users).set({ role }).where(eq(users.id, parseInt(req.params.id)));

    // Audit log
    const admin = (req as any).user;
    await db.insert(auditLogs).values({
      userId: admin.id,
      userRole: admin.role,
      userName: admin.name,
      userEmail: admin.email,
      action: "user.role_change",
      entityType: "user",
      entityId: req.params.id,
      details: JSON.stringify({ newRole: role }),
      ipAddress: req.ip?.slice(0, 50),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// POST /api/admin/users — create user
router.post("/users", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const [newUser] = await db.insert(users).values({
      name: name || null,
      email,
      passwordHash,
      role: role || "user",
      phone: phone || null,
      isVerified: true,
    }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/admin/users/:id — update user
router.put("/users/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

    const { name, email, phone, role, password } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (password && password.length >= 6) updates.passwordHash = await bcrypt.hash(password, 12);

    await db.update(users).set(updates).where(eq(users.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/admin/users/:id — delete user
router.delete("/users/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

    const admin = (req as any).user;
    if (admin.id === id) return res.status(400).json({ error: "Cannot delete your own account" });

    await db.update(users).set({ deletedAt: new Date(), email: `deleted_${id}@removed` }).where(eq(users.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ─── COMMENT MODERATION ─────────────────────────────────────────────────────

router.get("/comments/pending", requireAuth, requireEditor, async (_req: Request, res: Response) => {
  try {
    const items = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userName: users.name,
        articleTitle: articles.title,
        articleSlug: articles.slug,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .where(eq(comments.status, "pending"))
      .orderBy(desc(comments.createdAt))
      .limit(50);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending comments" });
  }
});

router.patch("/comments/:id/moderate", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid comment ID" });
    await db.update(comments).set({ status }).where(eq(comments.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to moderate comment" });
  }
});

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

router.get("/audit-logs", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { action, search } = req.query as any;

    const conditions: any[] = [];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (search) {
      const s = sanitizeForLike(search as string);
      conditions.push(
        or(
          like(auditLogs.userName, `%${s}%`),
          like(auditLogs.action, `%${s}%`),
          like(auditLogs.entityTitle, `%${s}%`)
        )
      );
    }

    const [items, [total]] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// ─── PAGE LAYOUTS (dynamic page builder) ────────────────────────────────────

router.get("/layouts", async (req: Request, res: Response) => {
  try {
    const siteId = parseInt((req.query.siteId as string) || "0") || (req as any).site?.id;
    const pageType = req.query.pageType as string;

    if (!siteId || !pageType) {
      return res.status(400).json({ error: "siteId and pageType required" });
    }

    const [layout] = await db
      .select()
      .from(pageLayouts)
      .where(
        and(
          eq(pageLayouts.siteId, siteId),
          eq(pageLayouts.pageType, pageType),
          eq(pageLayouts.isActive, true)
        )
      )
      .limit(1);

    res.json(layout ?? null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch layout" });
  }
});

router.put("/layouts", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { siteId, pageType, sections } = req.body;

    const [existing] = await db
      .select()
      .from(pageLayouts)
      .where(and(eq(pageLayouts.siteId, siteId), eq(pageLayouts.pageType, pageType)))
      .limit(1);

    if (existing) {
      await db
        .update(pageLayouts)
        .set({ sections, updatedAt: new Date() })
        .where(eq(pageLayouts.id, existing.id));
    } else {
      await db.insert(pageLayouts).values({ siteId, pageType, sections });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update layout" });
  }
});

export default router;
