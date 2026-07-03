import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { epaperIssues, epaperPages } from "../../drizzle/schema.js";
import { eq, and, desc, asc, count, gte, lte, lt, gt, sql } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { parsePagination } from "../utils/helpers.js";
import {
  epaperIssueCreateSchema,
  epaperIssueUpdateSchema,
  epaperPageAddSchema,
  epaperPageReorderSchema,
} from "../validations/index.js";

const router = Router();

// ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

// GET /api/epaper — list published issues for the current site
router.get("/", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });

    const { limit, offset } = parsePagination(req.query);
    const { from, to } = req.query as any;

    const conditions: any[] = [
      eq(epaperIssues.siteId, site.id),
      eq(epaperIssues.status, "published"),
    ];
    if (from) conditions.push(gte(epaperIssues.issueDate, new Date(from)));
    if (to) conditions.push(lte(epaperIssues.issueDate, new Date(to)));

    const [items, [total]] = await Promise.all([
      db.select().from(epaperIssues).where(and(...conditions)).orderBy(desc(epaperIssues.issueDate)).limit(limit).offset(offset),
      db.select({ c: count() }).from(epaperIssues).where(and(...conditions)),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch e-paper issues" });
  }
});

// GET /api/epaper/latest — most recent published issue for the current site
router.get("/latest", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });

    const [issue] = await db.select().from(epaperIssues)
      .where(and(eq(epaperIssues.siteId, site.id), eq(epaperIssues.status, "published")))
      .orderBy(desc(epaperIssues.issueDate)).limit(1);

    if (!issue) return res.status(404).json({ error: "No e-paper issue found" });

    const pages = await db.select().from(epaperPages).where(eq(epaperPages.issueId, issue.id)).orderBy(asc(epaperPages.pageNumber));
    res.json({ ...issue, pages });
  } catch { res.status(500).json({ error: "Failed to fetch latest issue" }); }
});

// GET /api/epaper/:id — issue detail with pages
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue || issue.status !== "published") return res.status(404).json({ error: "Issue not found" });

    const pages = await db.select().from(epaperPages).where(eq(epaperPages.issueId, id)).orderBy(asc(epaperPages.pageNumber));

    await db.update(epaperIssues).set({ viewsCount: sql`${epaperIssues.viewsCount} + 1` }).where(eq(epaperIssues.id, id));

    res.json({ ...issue, pages });
  } catch { res.status(500).json({ error: "Failed to fetch issue" }); }
});

// GET /api/epaper/:id/adjacent — neighboring published issue ids (for date-stepper nav)
router.get("/:id/adjacent", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue || issue.status !== "published") return res.status(404).json({ error: "Issue not found" });

    const [[prev], [next]] = await Promise.all([
      db.select({ id: epaperIssues.id, issueDate: epaperIssues.issueDate }).from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, issue.siteId), eq(epaperIssues.status, "published"), lt(epaperIssues.issueDate, issue.issueDate)))
        .orderBy(desc(epaperIssues.issueDate)).limit(1),
      db.select({ id: epaperIssues.id, issueDate: epaperIssues.issueDate }).from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, issue.siteId), eq(epaperIssues.status, "published"), gt(epaperIssues.issueDate, issue.issueDate)))
        .orderBy(asc(epaperIssues.issueDate)).limit(1),
    ]);

    res.json({ prevId: prev?.id ?? null, nextId: next?.id ?? null });
  } catch { res.status(500).json({ error: "Failed to fetch adjacent issues" }); }
});

// ─── ADMIN ENDPOINTS ───────────────────────────────────────────────────────

// GET /api/epaper/admin/list — all issues (optionally filtered by site)
router.get("/admin/list", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { siteId, status } = req.query as any;

    const conditions: any[] = [];
    if (siteId) conditions.push(eq(epaperIssues.siteId, parseInt(siteId)));
    if (status) conditions.push(eq(epaperIssues.status, status));

    const [items, [total]] = await Promise.all([
      db.select().from(epaperIssues).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(epaperIssues.issueDate)).limit(limit).offset(offset),
      db.select({ c: count() }).from(epaperIssues).where(conditions.length ? and(...conditions) : undefined),
    ]);

    res.json({ items, total: Number(total?.c ?? 0) });
  } catch { res.status(500).json({ error: "Failed to fetch issues" }); }
});

// GET /api/epaper/admin/:id — issue detail with pages (any status)
router.get("/admin/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const pages = await db.select().from(epaperPages).where(eq(epaperPages.issueId, id)).orderBy(asc(epaperPages.pageNumber));
    res.json({ ...issue, pages });
  } catch { res.status(500).json({ error: "Failed to fetch issue" }); }
});

// POST /api/epaper/admin — create a new issue
router.post("/admin", requireAuth, requireEditor, validateBody(epaperIssueCreateSchema), async (req: Request, res: Response) => {
  try {
    const { siteId, issueDate, coverImageUrl, pdfUrl, status } = req.body;

    const [issue] = await db.insert(epaperIssues).values({
      siteId,
      issueDate,
      coverImageUrl,
      pdfUrl,
      status: status || "draft",
      publishedAt: status === "published" ? new Date() : null,
    }).returning();

    res.status(201).json(issue);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "An issue already exists for this site and date" });
    if (err?.cause?.code === "23503") return res.status(400).json({ error: "Invalid site" });
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// PUT /api/epaper/admin/:id — update issue
router.put("/admin/:id", requireAuth, requireEditor, validateBody(epaperIssueUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { issueDate, coverImageUrl, pdfUrl, status } = req.body;

    const [existing] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    const updates: any = { updatedAt: new Date() };
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (pdfUrl !== undefined) updates.pdfUrl = pdfUrl;
    if (status !== undefined) {
      updates.status = status;
      if (status === "published" && existing.status !== "published") updates.publishedAt = new Date();
    }

    const [issue] = await db.update(epaperIssues).set(updates).where(eq(epaperIssues.id, id)).returning();
    res.json(issue);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "An issue already exists for this site and date" });
    res.status(500).json({ error: "Failed to update issue" });
  }
});

// DELETE /api/epaper/admin/:id
router.delete("/admin/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(epaperIssues).where(eq(epaperIssues.id, id));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete issue" }); }
});

// POST /api/epaper/admin/:id/pages — add page(s) to an issue
router.post("/admin/:id/pages", requireAuth, requireEditor, validateBody(epaperPageAddSchema), async (req: Request, res: Response) => {
  try {
    const issueId = parseInt(req.params.id);
    if (isNaN(issueId)) return res.status(400).json({ error: "Invalid issue ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, issueId)).limit(1);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const { pages } = req.body as { pages: { pageNumber: number; imageUrl: string; thumbnailUrl?: string }[] };

    const inserted = await db.insert(epaperPages).values(
      pages.map((p) => ({ issueId, pageNumber: p.pageNumber, imageUrl: p.imageUrl, thumbnailUrl: p.thumbnailUrl }))
    ).returning();

    res.status(201).json(inserted);
  } catch { res.status(500).json({ error: "Failed to add pages" }); }
});

// PUT /api/epaper/admin/:id/pages/reorder — reorder pages
router.put("/admin/:id/pages/reorder", requireAuth, requireEditor, validateBody(epaperPageReorderSchema), async (req: Request, res: Response) => {
  try {
    const issueId = parseInt(req.params.id);
    if (isNaN(issueId)) return res.status(400).json({ error: "Invalid issue ID" });

    const { pages } = req.body as { pages: { id: number; pageNumber: number }[] };

    await Promise.all(
      pages.map((p) =>
        db.update(epaperPages).set({ pageNumber: p.pageNumber }).where(and(eq(epaperPages.id, p.id), eq(epaperPages.issueId, issueId)))
      )
    );

    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to reorder pages" }); }
});

// DELETE /api/epaper/admin/pages/:pageId
router.delete("/admin/pages/:pageId", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.pageId);
    if (isNaN(pageId)) return res.status(400).json({ error: "Invalid page ID" });

    await db.delete(epaperPages).where(eq(epaperPages.id, pageId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete page" }); }
});

export default router;
