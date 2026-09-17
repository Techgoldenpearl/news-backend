import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import {
  reporters, reporterSubmissions, reporterNotifications, categories, articles, articleWebsites,
} from "../../drizzle/schema.js";
import { eq, and, desc, asc, sql, count, ilike } from "drizzle-orm";
import { requireAuth, requireEditor, requireReporterAuth, signReporterToken } from "../middleware/auth.js";
import { parsePagination, cookieOptions, sanitizeForLike } from "../utils/helpers.js";
import { validateBody } from "../middleware/validate.js";
import {
  reporterRegisterSchema,
  reporterProfileUpdateSchema,
  changePasswordSchema,
  mediaUploadSchema,
} from "../validations/index.js";
import { uploadToS3, deleteFromS3 } from "../config/storage.js";
import { optimizeAvatar } from "../utils/imageOptimizer.js";

const MAX_AVATAR_BASE64_SIZE = 7_000_000; // ~5MB decoded

const router = Router();

// ─── REPORTER AUTH ──────────────────────────────────────────────────────────

// POST /api/reporters/register
router.post("/register", validateBody(reporterRegisterSchema), async (req: Request, res: Response) => {
  try {
    const { name, nameHindi, email, password, phone, designation, beat, city, state, bio } = req.body;
    const [existing] = await db.select({ id: reporters.id }).from(reporters).where(eq(reporters.email, email)).limit(1);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate employee ID
    const [{ total }] = await db.select({ total: count() }).from(reporters);
    const year = new Date().getFullYear().toString().slice(-2);
    const employeeId = `PTR${year}${String(Number(total) + 1).padStart(4, "0")}`;

    const idCardExpiry = new Date();
    idCardExpiry.setFullYear(idCardExpiry.getFullYear() + 1);

    await db.insert(reporters).values({
      name, nameHindi, email, passwordHash, phone, designation, beat, city, state, bio,
      employeeId, idCardExpiry, status: "pending",
      siteId: (req as any).site?.id ?? null,
    });

    res.status(201).json({ success: true, employeeId });
  } catch (err) {
    console.error("[Reporter] Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/reporters/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const [reporter] = await db.select().from(reporters).where(eq(reporters.email, email)).limit(1);
    if (!reporter) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, reporter.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    if (reporter.status === "pending") return res.status(403).json({ error: "Your application is pending approval" });
    if (reporter.status === "rejected") return res.status(403).json({ error: "Registration rejected" });
    if (reporter.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    await db.update(reporters).set({ lastLoginAt: new Date() }).where(eq(reporters.id, reporter.id));

    const token = await signReporterToken(reporter.id);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("reporter_token", token, cookieOptions(isSecure));

    const { passwordHash: _, ...safe } = reporter;
    res.json({ success: true, reporter: safe, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/reporters/me
router.get("/me", requireReporterAuth, (req: Request, res: Response) => {
  res.json((req as any).reporter);
});

// POST /api/reporters/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("reporter_token", { path: "/" });
  res.json({ success: true });
});

// PUT /api/reporters/profile
router.put("/profile", requireReporterAuth, validateBody(reporterProfileUpdateSchema), async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const { name, nameHindi, phone, designation, beat, city, state, bio, twitterHandle, facebookUrl } = req.body;
    await db.update(reporters).set({
      name, nameHindi, phone, designation, beat, city, state, bio, twitterHandle, facebookUrl,
      updatedAt: new Date(),
    }).where(eq(reporters.id, reporter.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed" });
  }
});

// POST /api/reporters/photo — upload/replace the reporter's own profile photo
router.post("/photo", requireReporterAuth, validateBody(mediaUploadSchema), async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const { base64 } = req.body;

    if (base64.length > MAX_AVATAR_BASE64_SIZE) {
      return res.status(400).json({ error: "Image too large (max 5MB)" });
    }

    const rawBuffer = Buffer.from(base64, "base64");
    const { buffer, mimeType } = await optimizeAvatar(rawBuffer);

    const key = `reporters/${reporter.id}-${Date.now()}.webp`;
    const { url } = await uploadToS3(key, buffer, mimeType);

    const [existing] = await db.select({ photoKey: reporters.photoKey }).from(reporters).where(eq(reporters.id, reporter.id)).limit(1);

    await db.update(reporters).set({ photoUrl: url, photoKey: key, updatedAt: new Date() }).where(eq(reporters.id, reporter.id));

    if (existing?.photoKey) {
      await deleteFromS3(existing.photoKey).catch(() => {});
    }

    res.json({ success: true, photoUrl: url });
  } catch (err) {
    console.error("[Reporter] Photo upload error:", err);
    res.status(500).json({ error: "Photo upload failed" });
  }
});

// PUT /api/reporters/change-password
router.put("/change-password", requireReporterAuth, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const { currentPassword, newPassword } = req.body;

    const [cred] = await db.select({ passwordHash: reporters.passwordHash })
      .from(reporters).where(eq(reporters.id, reporter.id)).limit(1);

    const valid = await bcrypt.compare(currentPassword, cred?.passwordHash ?? "");
    if (!valid) return res.status(400).json({ error: "Current password incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(reporters).set({ passwordHash: newHash }).where(eq(reporters.id, reporter.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Password change failed" });
  }
});

// ─── REPORTER SUBMISSIONS ───────────────────────────────────────────────────

// POST /api/reporters/submissions
router.post("/submissions", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    if (reporter.status !== "active") return res.status(403).json({ error: "Account not active" });

    const { isDraft, siteId: _ignoredSiteId, ...data } = req.body;
    await db.insert(reporterSubmissions).values({
      ...data,
      reporterId: reporter.id,
      siteId: reporter.siteId,
      status: isDraft ? "draft" : "pending",
      submittedAt: isDraft ? null : new Date(),
    });

    if (!isDraft) {
      await db.update(reporters)
        .set({ submissionsCount: sql`${reporters.submissionsCount} + 1` })
        .where(eq(reporters.id, reporter.id));
    }

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Submission failed" });
  }
});

// GET /api/reporters/submissions
router.get("/submissions", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const { limit, offset } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const date = req.query.date as string | undefined;
    const sort = (req.query.sort as string) || "newest";

    const conditions: any[] = [eq(reporterSubmissions.reporterId, reporter.id)];
    if (status && status !== "all") conditions.push(eq(reporterSubmissions.status, status as any));
    if (categoryId) conditions.push(eq(reporterSubmissions.categoryId, parseInt(categoryId)));
    if (search) conditions.push(ilike(reporterSubmissions.title, `%${sanitizeForLike(search)}%`));
    if (date) conditions.push(sql`${reporterSubmissions.createdAt}::date = ${date}::date`);

    const orderBy = sort === "oldest" ? asc(reporterSubmissions.createdAt) : desc(reporterSubmissions.createdAt);

    const [items, [total]] = await Promise.all([
      db.select({
        id: reporterSubmissions.id,
        title: reporterSubmissions.title,
        titleHindi: reporterSubmissions.titleHindi,
        summary: reporterSubmissions.summary,
        content: reporterSubmissions.content,
        thumbnailUrl: reporterSubmissions.thumbnailUrl,
        status: reporterSubmissions.status,
        adminNote: reporterSubmissions.adminNote,
        isUrgent: reporterSubmissions.isUrgent,
        location: reporterSubmissions.location,
        state: reporterSubmissions.state,
        city: reporterSubmissions.city,
        categoryId: reporterSubmissions.categoryId,
        submittedAt: reporterSubmissions.submittedAt,
        createdAt: reporterSubmissions.createdAt,
        categoryName: categories.name,
        categoryNameHindi: categories.nameHindi,
      })
        .from(reporterSubmissions)
        .leftJoin(categories, eq(reporterSubmissions.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(reporterSubmissions).where(and(...conditions)),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// PUT /api/reporters/submissions/:id — reporter can only edit their own
// submission. If it's already been approved and published, the linked
// `articles` row is updated too so the live site reflects the edit rather
// than silently drifting from the submission record; the article's status
// stays "published" since the reporter is amending live content, not
// resubmitting it for a fresh review pass. A rejected submission is a
// closed record with no article, so it stays edit-only.
router.put("/submissions/:id", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const id = parseInt(req.params.id);
    const [sub] = await db.select().from(reporterSubmissions).where(eq(reporterSubmissions.id, id)).limit(1);
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    if (sub.reporterId !== reporter.id) return res.status(403).json({ error: "Not your submission" });
    if (sub.status === "rejected") {
      return res.status(400).json({ error: "This submission can no longer be edited" });
    }

    const { isDraft, ...data } = req.body;
    const isPublished = sub.status === "approved";
    // A published submission stays published on edit — only draft/pending
    // ones move between those two based on the isDraft toggle.
    const status = isPublished ? sub.status : isDraft ? "draft" : "pending";

    await db.update(reporterSubmissions).set({
      ...data,
      status,
      submittedAt: !isDraft && sub.status === "draft" ? new Date() : sub.submittedAt,
      updatedAt: new Date(),
    }).where(eq(reporterSubmissions.id, id));

    if (isPublished && sub.publishedArticleId) {
      await db.update(articles).set({
        title: data.title, titleHindi: data.titleHindi, summary: data.summary, content: data.content,
        categoryId: data.categoryId, thumbnailUrl: data.thumbnailUrl, isBreaking: data.isUrgent,
        location: data.location, state: data.state, city: data.city,
      }).where(eq(articles.id, sub.publishedArticleId));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update submission" });
  }
});

// DELETE /api/reporters/submissions/:id — reporter can only delete their
// own submission. If it's already published, the linked article is
// unpublished (moved to draft, not hard-deleted) rather than removed from
// the DB outright, so the same reversible-by-an-editor guarantee that
// covers every other article status also covers this path — a reporter's
// self-service delete shouldn't be the one action that erases a record
// no admin can recover.
router.delete("/submissions/:id", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const id = parseInt(req.params.id);
    const [sub] = await db.select().from(reporterSubmissions).where(eq(reporterSubmissions.id, id)).limit(1);
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    if (sub.reporterId !== reporter.id) return res.status(403).json({ error: "Not your submission" });
    if (sub.status === "rejected") {
      return res.status(400).json({ error: "This submission can no longer be deleted" });
    }

    if (sub.status === "approved" && sub.publishedArticleId) {
      await db.update(articles).set({ status: "draft", publishedAt: null }).where(eq(articles.id, sub.publishedArticleId));
    }

    await db.delete(reporterSubmissions).where(eq(reporterSubmissions.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

// GET /api/reporters/stats
router.get("/stats", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;

    const rows = await db.select({ status: reporterSubmissions.status, c: count() })
      .from(reporterSubmissions)
      .where(eq(reporterSubmissions.reporterId, reporter.id))
      .groupBy(reporterSubmissions.status);

    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.c);

    res.json({
      total: reporter.submissionsCount,
      approved: reporter.approvedCount,
      totalViews: reporter.totalViewsCount,
      draft: byStatus.draft ?? 0,
      // "pending review" covers both pending and under_review — the reporter
      // sees one bucket; the admin side is where the finer distinction matters.
      pendingReview: (byStatus.pending ?? 0) + (byStatus.under_review ?? 0),
      // A submission's `articles` row is created only on approval (see
      // /admin/submissions/:id/approve), so "approved" here means published.
      published: byStatus.approved ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/reporters/notifications
router.get("/notifications", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    const items = await db.select().from(reporterNotifications)
      .where(eq(reporterNotifications.reporterId, reporter.id))
      .orderBy(desc(reporterNotifications.createdAt))
      .limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /api/reporters/notifications/:id/read
router.patch("/notifications/:id/read", requireReporterAuth, async (req: Request, res: Response) => {
  try {
    const reporter = (req as any).reporter;
    await db.update(reporterNotifications).set({ isRead: true })
      .where(and(eq(reporterNotifications.id, parseInt(req.params.id)), eq(reporterNotifications.reporterId, reporter.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification" });
  }
});

// GET /api/reporters/id-card
router.get("/id-card", requireReporterAuth, (req: Request, res: Response) => {
  res.json((req as any).reporter);
});

// GET /api/reporters/top — public leaderboard
router.get("/top", async (_req: Request, res: Response) => {
  try {
    const items = await db.select({
      id: reporters.id, employeeId: reporters.employeeId, name: reporters.name,
      designation: reporters.designation, beat: reporters.beat, city: reporters.city,
      photoUrl: reporters.photoUrl, approvedCount: reporters.approvedCount,
      totalViewsCount: reporters.totalViewsCount,
    })
      .from(reporters)
      .where(eq(reporters.status, "active"))
      .orderBy(desc(reporters.totalViewsCount))
      .limit(10);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch top reporters" });
  }
});

// ─── ADMIN REPORTER MANAGEMENT ──────────────────────────────────────────────

// GET /api/reporters/admin/list
router.get("/admin/list", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const status = req.query.status as string | undefined;

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(reporters.status, status as any));

    const items = await db.select({
      id: reporters.id, employeeId: reporters.employeeId, name: reporters.name,
      email: reporters.email, phone: reporters.phone, photoUrl: reporters.photoUrl,
      designation: reporters.designation, beat: reporters.beat, city: reporters.city,
      state: reporters.state, status: reporters.status, adminNote: reporters.adminNote,
      submissionsCount: reporters.submissionsCount, approvedCount: reporters.approvedCount,
      createdAt: reporters.createdAt,
    })
      .from(reporters)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reporters.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reporters" });
  }
});

// PATCH /api/reporters/admin/:id/approve
router.patch("/admin/:id/approve", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const idCardExpiry = new Date();
    idCardExpiry.setFullYear(idCardExpiry.getFullYear() + 1);

    await db.update(reporters).set({
      status: "active", approvedBy: (req as any).user.id, approvedAt: new Date(), idCardExpiry,
    }).where(eq(reporters.id, id));

    await db.insert(reporterNotifications).values({
      reporterId: id, type: "account_approved", title: "Account Approved", message: "Your reporter account has been approved.",
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve reporter" });
  }
});

// PATCH /api/reporters/admin/:id/reject
router.patch("/admin/:id/reject", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.update(reporters).set({ status: "rejected", adminNote: req.body.note })
      .where(eq(reporters.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject reporter" });
  }
});

// PATCH /api/reporters/admin/:id/suspend
router.patch("/admin/:id/suspend", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    await db.update(reporters).set({ status: "suspended", adminNote: req.body.note })
      .where(eq(reporters.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to suspend reporter" });
  }
});

// PATCH /api/reporters/admin/:id/reactivate — restores a suspended reporter to active
// without re-running the approval flow (idCardExpiry/approvedAt already set from the
// original approval), so their existing ID card stays valid.
router.patch("/admin/:id/reactivate", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(reporters).set({ status: "active", adminNote: req.body.note ?? null })
      .where(eq(reporters.id, id));

    await db.insert(reporterNotifications).values({
      reporterId: id, type: "account_approved", title: "Account Reactivated", message: "Your reporter account has been reactivated.",
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reactivate reporter" });
  }
});

// GET /api/reporters/admin/submissions
router.get("/admin/submissions", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const status = req.query.status as string | undefined;

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(reporterSubmissions.status, status as any));

    const items = await db.select({
      id: reporterSubmissions.id, title: reporterSubmissions.title, summary: reporterSubmissions.summary,
      content: reporterSubmissions.content, thumbnailUrl: reporterSubmissions.thumbnailUrl,
      status: reporterSubmissions.status, isUrgent: reporterSubmissions.isUrgent,
      submittedAt: reporterSubmissions.submittedAt, createdAt: reporterSubmissions.createdAt,
      categoryName: categories.name,
      reporterName: reporters.name, reporterEmployeeId: reporters.employeeId,
    })
      .from(reporterSubmissions)
      .leftJoin(categories, eq(reporterSubmissions.categoryId, categories.id))
      .leftJoin(reporters, eq(reporterSubmissions.reporterId, reporters.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reporterSubmissions.submittedAt))
      .limit(limit)
      .offset(offset);

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// PATCH /api/reporters/admin/submissions/:id/approve
router.patch("/admin/submissions/:id/approve", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const admin = (req as any).user;
    const [sub] = await db.select().from(reporterSubmissions).where(eq(reporterSubmissions.id, id)).limit(1);
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    if (!sub.categoryId) return res.status(400).json({ error: "Submission has no category; cannot publish" });

    const slugBase = sub.title.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 200);
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const [newArticle] = await db.insert(articles).values({
      siteId: sub.siteId,
      title: sub.title,
      titleHindi: sub.titleHindi,
      slug,
      summary: sub.summary,
      content: sub.content,
      authorId: admin.id,
      categoryId: sub.categoryId,
      thumbnailUrl: sub.thumbnailUrl,
      isBreaking: sub.isUrgent,
      status: "published",
      location: sub.location,
      state: sub.state,
      city: sub.city,
      publishedAt: new Date(),
    }).returning({ id: articles.id });

    if (sub.siteId) {
      await db.insert(articleWebsites).values({ articleId: newArticle.id, siteId: sub.siteId });
    }

    await db.update(reporterSubmissions).set({
      status: "approved", reviewedBy: admin.id, reviewedAt: new Date(), adminNote: req.body.note,
      publishedArticleId: newArticle.id,
    }).where(eq(reporterSubmissions.id, id));

    await db.update(reporters)
      .set({ approvedCount: sql`${reporters.approvedCount} + 1` })
      .where(eq(reporters.id, sub.reporterId));

    await db.insert(reporterNotifications).values({
      reporterId: sub.reporterId, type: "submission_approved",
      title: "Submission Approved", message: `Your article "${sub.title}" has been approved and published.`, submissionId: id,
    });

    res.json({ success: true, articleId: newArticle.id });
  } catch (err) {
    console.error("[Reporter] Approve submission error:", err);
    res.status(500).json({ error: "Failed to approve submission" });
  }
});

// PATCH /api/reporters/admin/submissions/:id/reject
router.patch("/admin/submissions/:id/reject", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(reporterSubmissions).set({
      status: "rejected", adminNote: req.body.note, reviewedBy: (req as any).user.id, reviewedAt: new Date(),
    }).where(eq(reporterSubmissions.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject submission" });
  }
});

// PATCH /api/reporters/admin/submissions/:id/revision
router.patch("/admin/submissions/:id/revision", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(reporterSubmissions).set({
      status: "revision_requested", adminNote: req.body.note, reviewedBy: (req as any).user.id, reviewedAt: new Date(),
    }).where(eq(reporterSubmissions.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to request revision" });
  }
});

export default router;
