import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { shokSandesh, shokSandeshPackages } from "../../drizzle/schema.js";
import { eq, desc, and, or, like, count, gte, sql } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { parsePagination, sanitizeForLike } from "../utils/helpers.js";

const router = Router();

// ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/shok-sandesh — public listing
router.get("/", async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { type, city, search } = req.query as any;

    const conditions: any[] = [
      eq(shokSandesh.status, "approved"),
      or(gte(shokSandesh.expiresAt, new Date()), sql`${shokSandesh.expiresAt} IS NULL`),
    ];

    if (type) conditions.push(eq(shokSandesh.type, type));
    if (city) conditions.push(eq(shokSandesh.city, city));
    if (search) conditions.push(or(
      like(shokSandesh.deceasedName, `%${sanitizeForLike(search)}%`),
      like(shokSandesh.familyName, `%${sanitizeForLike(search)}%`)
    ));

    const [items, [total]] = await Promise.all([
      db.select().from(shokSandesh).where(and(...conditions)).orderBy(desc(shokSandesh.createdAt)).limit(limit).offset(offset),
      db.select({ c: count() }).from(shokSandesh).where(and(...conditions)),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// GET /api/shok-sandesh/packages
router.get("/packages", async (_req: Request, res: Response) => {
  try {
    const items = await db.select().from(shokSandeshPackages).where(eq(shokSandeshPackages.isActive, true));
    res.json(items);
  } catch { res.status(500).json({ error: "Failed to fetch packages" }); }
});

// GET /api/shok-sandesh/:id — public detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [item] = await db.select().from(shokSandesh).where(eq(shokSandesh.id, id)).limit(1);
    if (!item || item.status !== "approved") return res.status(404).json({ error: "Not found" });

    await db.update(shokSandesh).set({ viewsCount: (item.viewsCount || 0) + 1 }).where(eq(shokSandesh.id, id));
    res.json(item);
  } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// ─── FAMILY/USER SUBMIT ────────────────────────────────────────────────────

// POST /api/shok-sandesh/submit — family submits a new entry
router.post("/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type, deceasedName, deceasedNameHindi, deceasedPhoto, deceasedAge, dateOfDeath, place, city, state, familyName, familyNameHindi, message, messageHindi, eventDetails, eventDetailsHindi, eventDate, eventPlace, templateId, packageType } = req.body;

    if (!deceasedName || !type) return res.status(400).json({ error: "Deceased name and type required" });

    const [entry] = await db.insert(shokSandesh).values({
      userId: user.id,
      siteId: (req as any).site?.id || null,
      type, deceasedName, deceasedNameHindi, deceasedPhoto, deceasedAge,
      dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : null,
      place, city, state, familyName, familyNameHindi,
      message, messageHindi, eventDetails, eventDetailsHindi,
      eventDate: eventDate ? new Date(eventDate) : null,
      eventPlace, templateId, packageType: packageType || "basic_text",
      status: "pending",
    }).returning();

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit" });
  }
});

// ─── ADMIN ENDPOINTS ───────────────────────────────────────────────────────

// GET /api/shok-sandesh/admin/list
router.get("/admin/list", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { status, type, search } = req.query as any;

    const conditions: any[] = [];
    if (status) conditions.push(eq(shokSandesh.status, status));
    if (type) conditions.push(eq(shokSandesh.type, type));
    if (search) conditions.push(like(shokSandesh.deceasedName, `%${sanitizeForLike(search)}%`));

    const [items, [total]] = await Promise.all([
      db.select().from(shokSandesh).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(shokSandesh.createdAt)).limit(limit).offset(offset),
      db.select({ c: count() }).from(shokSandesh).where(conditions.length ? and(...conditions) : undefined),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch { res.status(500).json({ error: "Failed to fetch" }); }
});

// POST /api/shok-sandesh/admin/create — admin creates directly
router.post("/admin/create", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [entry] = await db.insert(shokSandesh).values({
      ...data,
      userId: (req as any).user.id,
      siteId: data.siteId || (req as any).site?.id || null,
      dateOfDeath: data.dateOfDeath ? new Date(data.dateOfDeath) : null,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      status: "approved",
      publishedAt: new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentStatus: "admin",
    }).returning();

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to create" });
  }
});

// PATCH /api/shok-sandesh/admin/:id/approve
router.patch("/admin/:id/approve", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.update(shokSandesh).set({ status: "approved", publishedAt: new Date(), expiresAt, updatedAt: new Date() }).where(eq(shokSandesh.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to approve" }); }
});

// PATCH /api/shok-sandesh/admin/:id/reject
router.patch("/admin/:id/reject", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    await db.update(shokSandesh).set({ status: "rejected", rejectionReason: reason || "Not approved", updatedAt: new Date() }).where(eq(shokSandesh.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to reject" }); }
});

// PUT /api/shok-sandesh/admin/:id — update
router.put("/admin/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = { ...req.body, updatedAt: new Date() };
    if (updates.dateOfDeath) updates.dateOfDeath = new Date(updates.dateOfDeath);
    if (updates.eventDate) updates.eventDate = new Date(updates.eventDate);
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);
    delete updates.id;
    delete updates.createdAt;

    await db.update(shokSandesh).set(updates).where(eq(shokSandesh.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// DELETE /api/shok-sandesh/admin/:id
router.delete("/admin/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(shokSandesh).where(eq(shokSandesh.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete" }); }
});

// ─── PACKAGE MANAGEMENT ────────────────────────────────────────────────────

router.post("/admin/packages", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [pkg] = await db.insert(shokSandeshPackages).values(req.body).returning();
    res.status(201).json(pkg);
  } catch { res.status(500).json({ error: "Failed to create package" }); }
});

router.put("/admin/packages/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(shokSandeshPackages).set(req.body).where(eq(shokSandeshPackages.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

export default router;
