import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { classifiedAds, classifiedPackages, classifiedReports } from "../../drizzle/schema.js";
import { eq, desc, and, or, like, count, lte, gte, sql } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { parsePagination, sanitizeForLike } from "../utils/helpers.js";

const router = Router();

// ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/classifieds — public listing
router.get("/", async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { category, city, search, featured } = req.query as any;

    const conditions: any[] = [
      eq(classifiedAds.status, "approved"),
      or(gte(classifiedAds.expiresAt, new Date()), sql`${classifiedAds.expiresAt} IS NULL`),
    ];

    if (category) conditions.push(eq(classifiedAds.category, category));
    if (city) conditions.push(eq(classifiedAds.city, city));
    if (featured === "true") conditions.push(eq(classifiedAds.isFeatured, true));
    if (search) conditions.push(like(classifiedAds.title, `%${sanitizeForLike(search)}%`));

    const [items, [total]] = await Promise.all([
      db.select().from(classifiedAds).where(and(...conditions)).orderBy(desc(classifiedAds.createdAt)).limit(limit).offset(offset),
      db.select({ c: count() }).from(classifiedAds).where(and(...conditions)),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch classifieds" });
  }
});

// GET /api/classifieds/packages — public packages
router.get("/packages", async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(classifiedPackages).where(eq(classifiedPackages.isActive, true));
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch packages" }); }
});

// POST /api/classifieds/report — report an ad
router.post("/report", async (req: Request, res: Response) => {
  try {
    const { adId, reason, reporterName } = req.body;
    if (!adId || !reason) return res.status(400).json({ error: "Ad ID and reason required" });

    await db.insert(classifiedReports).values({ adId, reason, reporterName });
    await db.update(classifiedAds).set({ reportCount: sql`${classifiedAds.reportCount} + 1` }).where(eq(classifiedAds.id, adId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to report" }); }
});

// ─── ADVERTISER ENDPOINTS (authenticated users) ────────────────────────────

// POST /api/classifieds/submit — submit a new ad
router.post("/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { category, title, titleHindi, description, descriptionHindi, images, price, contactName, contactPhone, contactWhatsapp, contactEmail, city, area, state, packageType } = req.body;

    if (!title?.trim() || !category) return res.status(400).json({ error: "Title and category required" });

    const [ad] = await db.insert(classifiedAds).values({
      userId: user.id,
      siteId: (req as any).site?.id || null,
      category, title, titleHindi, description, descriptionHindi,
      images: images || [], price, contactName, contactPhone, contactWhatsapp, contactEmail,
      city, area, state, packageType: packageType || "basic",
      status: "pending",
    }).returning();

    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit ad" });
  }
});

// GET /api/classifieds/my-ads — user's own ads
router.get("/my-ads", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const items = await db.select().from(classifiedAds).where(eq(classifiedAds.userId, user.id)).orderBy(desc(classifiedAds.createdAt));
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch ads" }); }
});

// GET /api/classifieds/:id — public detail (must stay below /my-ads, /packages, /report — Express matches single-segment routes in registration order)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [ad] = await db.select().from(classifiedAds).where(eq(classifiedAds.id, id)).limit(1);
    if (!ad || ad.status !== "approved") return res.status(404).json({ error: "Ad not found" });

    await db.update(classifiedAds).set({ viewsCount: (ad.viewsCount || 0) + 1 }).where(eq(classifiedAds.id, id));
    res.json(ad);
  } catch { res.status(500).json({ error: "Failed to fetch ad" }); }
});

// ─── ADMIN ENDPOINTS ───────────────────────────────────────────────────────

// GET /api/classifieds/admin/list — all ads for admin
router.get("/admin/list", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { status, category, search } = req.query as any;

    const conditions: any[] = [];
    if (status) conditions.push(eq(classifiedAds.status, status));
    if (category) conditions.push(eq(classifiedAds.category, category));
    if (search) conditions.push(like(classifiedAds.title, `%${sanitizeForLike(search)}%`));

    const [items, [total]] = await Promise.all([
      db.select().from(classifiedAds).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(classifiedAds.createdAt)).limit(limit).offset(offset),
      db.select({ c: count() }).from(classifiedAds).where(conditions.length ? and(...conditions) : undefined),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// POST /api/classifieds/admin/create — admin creates ad directly
router.post("/admin/create", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { category, title, titleHindi, description, descriptionHindi, images, price, contactName, contactPhone, contactWhatsapp, contactEmail, city, area, state, packageType, isFeatured, isUrgent, isHomepage, expiresAt } = req.body;

    const [ad] = await db.insert(classifiedAds).values({
      userId: (req as any).user.id,
      siteId: (req as any).site?.id || req.body.siteId || null,
      category, title, titleHindi, description, descriptionHindi,
      images: images || [], price, contactName, contactPhone, contactWhatsapp, contactEmail,
      city, area, state, packageType: packageType || "basic",
      status: "approved", isFeatured, isUrgent, isHomepage,
      publishedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentStatus: "admin",
    }).returning();

    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ error: "Failed to create ad" });
  }
});

// PATCH /api/classifieds/admin/:id/approve
router.patch("/admin/:id/approve", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.update(classifiedAds).set({ status: "approved", publishedAt: new Date(), expiresAt, updatedAt: new Date() }).where(eq(classifiedAds.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to approve" }); }
});

// PATCH /api/classifieds/admin/:id/reject
router.patch("/admin/:id/reject", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    await db.update(classifiedAds).set({ status: "rejected", rejectionReason: reason || "Not approved", updatedAt: new Date() }).where(eq(classifiedAds.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to reject" }); }
});

// PUT /api/classifieds/admin/:id — update ad
router.put("/admin/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, titleHindi, description, descriptionHindi, images, price, contactName, contactPhone, city, area, state, category, isFeatured, isUrgent, isHomepage, expiresAt, status } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (titleHindi !== undefined) updates.titleHindi = titleHindi;
    if (description !== undefined) updates.description = description;
    if (descriptionHindi !== undefined) updates.descriptionHindi = descriptionHindi;
    if (images !== undefined) updates.images = images;
    if (price !== undefined) updates.price = price;
    if (contactName !== undefined) updates.contactName = contactName;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (city !== undefined) updates.city = city;
    if (area !== undefined) updates.area = area;
    if (state !== undefined) updates.state = state;
    if (category !== undefined) updates.category = category;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (isUrgent !== undefined) updates.isUrgent = isUrgent;
    if (isHomepage !== undefined) updates.isHomepage = isHomepage;
    if (expiresAt !== undefined) updates.expiresAt = new Date(expiresAt);
    if (status !== undefined) updates.status = status;

    await db.update(classifiedAds).set(updates).where(eq(classifiedAds.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// DELETE /api/classifieds/admin/:id
router.delete("/admin/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(classifiedAds).where(eq(classifiedAds.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// GET /api/classifieds/admin/reports — reported ads
router.get("/admin/reports", requireAuth, requireEditor, async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(classifiedReports).where(eq(classifiedReports.status, "pending")).orderBy(desc(classifiedReports.createdAt));
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch reports" }); }
});

// ─── PACKAGE MANAGEMENT ────────────────────────────────────────────────────

router.post("/admin/packages", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [pkg] = await db.insert(classifiedPackages).values(req.body).returning();
    res.status(201).json(pkg);
  } catch { res.status(500).json({ error: "Failed to create package" }); }
});

router.put("/admin/packages/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(classifiedPackages).set(req.body).where(eq(classifiedPackages.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to update package" }); }
});

router.delete("/admin/packages/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(classifiedPackages).where(eq(classifiedPackages.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete package" }); }
});

export default router;
