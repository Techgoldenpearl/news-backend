import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import {
  ads, adImpressions, adClicks,
  advertisers, advertiserAdRequests, revenueConfig,
} from "../../drizzle/schema.js";
import { eq, and, desc, or, isNull, lte, gte, count, sql } from "drizzle-orm";
import {
  requireAuth, requireAdmin, optionalAuth,
  requireAdvertiserAuth, signAdvertiserToken,
} from "../middleware/auth.js";
import { parsePagination, cookieOptions } from "../utils/helpers.js";
import bcrypt from "bcryptjs";

const router = Router();

// ─── PUBLIC AD ENDPOINTS ────────────────────────────────────────────────────

// GET /api/ads/zone/:zone — get active ad for a zone
router.get("/zone/:zone", async (req: Request, res: Response) => {
  try {
    const { zone } = req.params;
    const device = (req.query.device as string) || "desktop";
    const now = new Date();

    const siteId = (req as any).site?.id;
    const conditions: any[] = [
      eq(ads.zone, zone as any),
      eq(ads.status, "active"),
      or(eq(ads.deviceTarget, "all"), eq(ads.deviceTarget, device as any)),
      or(isNull(ads.startDate), lte(ads.startDate, now)),
      or(isNull(ads.endDate), gte(ads.endDate, now)),
    ];
    if (siteId) conditions.push(or(eq(ads.siteId, siteId), isNull(ads.siteId)));

    const [ad] = await db.select().from(ads)
      .where(and(...conditions))
      .orderBy(desc(ads.priority), desc(ads.createdAt))
      .limit(1);

    res.json(ad ?? null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ad" });
  }
});

// POST /api/ads/impression
router.post("/impression", async (req: Request, res: Response) => {
  try {
    const { adId, sessionId } = req.body;
    await db.insert(adImpressions).values({
      adId,
      sessionId,
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
      ip: req.ip?.slice(0, 64) ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to record impression" });
  }
});

// POST /api/ads/click
router.post("/click", async (req: Request, res: Response) => {
  try {
    const { adId, sessionId } = req.body;
    await db.insert(adClicks).values({
      adId,
      sessionId,
      ip: req.ip?.slice(0, 64) ?? null,
      referer: req.headers.referer?.slice(0, 500) ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to record click" });
  }
});

// ─── ADMIN AD MANAGEMENT ────────────────────────────────────────────────────

// GET /api/ads/admin/list
router.get("/admin/list", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { zone, status } = req.query as any;

    const conditions: any[] = [];
    if (zone) conditions.push(eq(ads.zone, zone));
    if (status) conditions.push(eq(ads.status, status));

    const items = await db.select().from(ads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ads.priority), desc(ads.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ c: count() }).from(ads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ads" });
  }
});

// POST /api/ads/admin
router.post("/admin", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [newAd] = await db.insert(ads).values({ ...req.body, createdBy: user.id }).returning();
    res.status(201).json(newAd);
  } catch (err) {
    res.status(500).json({ error: "Failed to create ad" });
  }
});

// PUT /api/ads/admin/:id
router.put("/admin/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(ads).set({ ...req.body, updatedAt: new Date() }).where(eq(ads.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update ad" });
  }
});

// DELETE /api/ads/admin/:id
router.delete("/admin/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(ads).where(eq(ads.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete ad" });
  }
});

// GET /api/ads/analytics
router.get("/analytics", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || "30");
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    const zoneSummary = await db
      .select({
        zone: ads.zone,
        impressions: sql<number>`COALESCE(COUNT(DISTINCT ${adImpressions.id}), 0)`,
        clicks: sql<number>`COALESCE(COUNT(DISTINCT ${adClicks.id}), 0)`,
      })
      .from(ads)
      .leftJoin(adImpressions, and(eq(adImpressions.adId, ads.id), gte(adImpressions.createdAt, since)))
      .leftJoin(adClicks, and(eq(adClicks.adId, ads.id), gte(adClicks.createdAt, since)))
      .groupBy(ads.zone);

    res.json({ zoneSummary });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ─── ADVERTISER PORTAL ──────────────────────────────────────────────────────

// POST /api/ads/advertiser/register
router.post("/advertiser/register", async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, email, password, phone, gstNumber, website } = req.body;
    const [existing] = await db.select({ id: advertisers.id }).from(advertisers).where(eq(advertisers.email, email)).limit(1);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const [adv] = await db.insert(advertisers).values({
      companyName, contactName, email, passwordHash, phone, gstNumber, website, status: "pending",
    }).returning({ id: advertisers.id });

    const token = await signAdvertiserToken(adv.id);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("advertiser_token", token, cookieOptions(isSecure));
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/ads/advertiser/login
router.post("/advertiser/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const [adv] = await db.select().from(advertisers).where(eq(advertisers.email, email)).limit(1);
    if (!adv) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, adv.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    if (adv.status === "suspended") return res.status(403).json({ error: "Account suspended" });

    const token = await signAdvertiserToken(adv.id);
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("advertiser_token", token, cookieOptions(isSecure));
    res.json({ success: true, advertiser: { id: adv.id, companyName: adv.companyName, email: adv.email, status: adv.status } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/ads/advertiser/me
router.get("/advertiser/me", requireAdvertiserAuth, async (req: Request, res: Response) => {
  res.json((req as any).advertiser);
});

// POST /api/ads/advertiser/logout
router.post("/advertiser/logout", (_req: Request, res: Response) => {
  res.clearCookie("advertiser_token", { path: "/" });
  res.json({ success: true });
});

// POST /api/ads/advertiser/request
router.post("/advertiser/request", requireAdvertiserAuth, async (req: Request, res: Response) => {
  try {
    const adv = (req as any).advertiser;
    if (adv.status !== "active") return res.status(403).json({ error: "Account not approved" });
    await db.insert(advertiserAdRequests).values({ ...req.body, advertiserId: adv.id, status: "pending" });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit ad request" });
  }
});

// GET /api/ads/advertiser/requests
router.get("/advertiser/requests", requireAdvertiserAuth, async (req: Request, res: Response) => {
  try {
    const adv = (req as any).advertiser;
    const requests = await db.select().from(advertiserAdRequests)
      .where(eq(advertiserAdRequests.advertiserId, adv.id))
      .orderBy(desc(advertiserAdRequests.createdAt));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ad requests" });
  }
});

// GET /api/ads/advertiser/stats
router.get("/advertiser/stats", requireAdvertiserAuth, async (req: Request, res: Response) => {
  try {
    const adv = (req as any).advertiser;
    const myRequests = await db.select().from(advertiserAdRequests)
      .where(eq(advertiserAdRequests.advertiserId, adv.id));

    let totalImpressions = 0, totalClicks = 0;
    for (const req of myRequests.filter(r => r.linkedAdId)) {
      const [imp] = await db.select({ c: count() }).from(adImpressions).where(eq(adImpressions.adId, req.linkedAdId!));
      const [clk] = await db.select({ c: count() }).from(adClicks).where(eq(adClicks.adId, req.linkedAdId!));
      totalImpressions += Number(imp?.c ?? 0);
      totalClicks += Number(clk?.c ?? 0);
    }

    res.json({
      totalAds: myRequests.length,
      activeAds: myRequests.filter(r => r.status === "approved").length,
      totalImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── ADMIN ADVERTISER MANAGEMENT ────────────────────────────────────────────

// GET /api/ads/admin/advertisers
router.get("/admin/advertisers", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const items = await db
      .select({
        id: advertisers.id,
        companyName: advertisers.companyName,
        contactName: advertisers.contactName,
        email: advertisers.email,
        phone: advertisers.phone,
        status: advertisers.status,
        createdAt: advertisers.createdAt,
      })
      .from(advertisers)
      .orderBy(desc(advertisers.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch advertisers" });
  }
});

// PATCH /api/ads/admin/advertisers/:id/approve
router.patch("/admin/advertisers/:id/approve", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(advertisers).set({ status: "active" }).where(eq(advertisers.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve advertiser" });
  }
});

// PATCH /api/ads/admin/advertisers/:id/suspend
router.patch("/admin/advertisers/:id/suspend", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(advertisers).set({ status: "suspended" }).where(eq(advertisers.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to suspend advertiser" });
  }
});

// GET /api/ads/admin/requests
router.get("/admin/requests", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const items = await db
      .select({
        request: advertiserAdRequests,
        advertiser: { id: advertisers.id, companyName: advertisers.companyName, email: advertisers.email },
      })
      .from(advertiserAdRequests)
      .leftJoin(advertisers, eq(advertiserAdRequests.advertiserId, advertisers.id))
      .orderBy(desc(advertiserAdRequests.createdAt))
      .limit(limit)
      .offset(offset);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ad requests" });
  }
});

// PATCH /api/ads/admin/requests/:id/approve
router.patch("/admin/requests/:id/approve", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [adReq] = await db.select().from(advertiserAdRequests).where(eq(advertiserAdRequests.id, id)).limit(1);
    if (!adReq) return res.status(404).json({ error: "Request not found" });

    const [newAd] = await db.insert(ads).values({
      name: adReq.name,
      zone: adReq.zone as any,
      type: "image",
      imageUrl: adReq.imageUrl,
      linkUrl: adReq.linkUrl,
      altText: adReq.altText ?? adReq.name,
      width: adReq.width ?? 300,
      height: adReq.height ?? 250,
      deviceTarget: adReq.deviceTarget,
      startDate: adReq.startDate,
      endDate: adReq.endDate,
      status: "active",
      priority: 5,
      createdBy: (req as any).user.id,
    }).returning({ id: ads.id });

    await db.update(advertiserAdRequests).set({ status: "approved", linkedAdId: newAd.id }).where(eq(advertiserAdRequests.id, id));
    res.json({ success: true, linkedAdId: newAd.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve request" });
  }
});

// PATCH /api/ads/admin/requests/:id/reject
router.patch("/admin/requests/:id/reject", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.update(advertiserAdRequests)
      .set({ status: "rejected", adminNote: req.body.adminNote })
      .where(eq(advertiserAdRequests.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject request" });
  }
});

// ─── REVENUE CONFIG ─────────────────────────────────────────────────────────

// GET /api/ads/revenue-config
router.get("/revenue-config", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const config = await db.select().from(revenueConfig).orderBy(revenueConfig.zone);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch revenue config" });
  }
});

// PUT /api/ads/revenue-config
router.put("/revenue-config", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { zone, cpmRate, cpcRate } = req.body;
    const [existing] = await db.select().from(revenueConfig).where(eq(revenueConfig.zone, zone)).limit(1);
    if (existing) {
      await db.update(revenueConfig).set({ cpmRate, cpcRate }).where(eq(revenueConfig.zone, zone));
    } else {
      await db.insert(revenueConfig).values({ zone, cpmRate, cpcRate });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update revenue config" });
  }
});

export default router;
