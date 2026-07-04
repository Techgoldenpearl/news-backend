import { Router, Request, Response } from "express";
import sharp from "sharp";
import multer from "multer";
import { db } from "../config/db.js";
import { epaperIssues, epaperPages, epaperPageRegions, articles } from "../../drizzle/schema.js";
import { eq, and, desc, asc, count, gte, lte, lt, gt, sql, inArray, or } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { parsePagination } from "../utils/helpers.js";
import { uploadToS3 } from "../config/storage.js";
import { processPdfIssue } from "../utils/epaperPdfProcessor.js";
import {
  epaperIssueCreateSchema,
  epaperIssueUpdateSchema,
  epaperPageAddSchema,
  epaperPageReorderSchema,
  epaperByDateQuerySchema,
  epaperCalendarQuerySchema,
  epaperEditionsForDateQuerySchema,
  epaperRegionCreateSchema,
  epaperClipQuerySchema,
} from "../validations/index.js";

const MAX_PDF_SIZE = 60 * 1024 * 1024;
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("Only PDF files are allowed"));
    cb(null, true);
  },
});

const router = Router();

// Attach regions (with resolved article slug) to a list of pages, grouped by pageId.
async function attachRegions<T extends { id: number }>(pages: T[]): Promise<(T & { regions: any[] })[]> {
  if (pages.length === 0) return [];
  const pageIds = pages.map((p) => p.id);
  const regions = await db
    .select({
      id: epaperPageRegions.id,
      pageId: epaperPageRegions.pageId,
      articleId: epaperPageRegions.articleId,
      externalUrl: epaperPageRegions.externalUrl,
      x: epaperPageRegions.x,
      y: epaperPageRegions.y,
      width: epaperPageRegions.width,
      height: epaperPageRegions.height,
      label: epaperPageRegions.label,
      articleSlug: articles.slug,
    })
    .from(epaperPageRegions)
    .leftJoin(articles, eq(epaperPageRegions.articleId, articles.id))
    .where(
      and(
        inArray(epaperPageRegions.pageId, pageIds),
        or(sql`${epaperPageRegions.articleId} IS NOT NULL`, sql`${epaperPageRegions.externalUrl} IS NOT NULL`)
      )
    );

  const byPage = new Map<number, any[]>();
  for (const r of regions) {
    if (!byPage.has(r.pageId)) byPage.set(r.pageId, []);
    byPage.get(r.pageId)!.push(r);
  }
  return pages.map((p) => ({ ...p, regions: byPage.get(p.id) ?? [] }));
}

// UTC-midnight day-range helper: [start, nextDayStart) matching how bare YYYY-MM-DD strings are coerced.
function dayRange(date: Date): [Date, Date] {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
}

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

// GET /api/epaper/by-date — resolve an issue id from a date + edition
router.get("/by-date", validateQuery(epaperByDateQuerySchema), async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });

    const { date, edition } = req.query as any as { date: Date; edition: string };
    const [start, end] = dayRange(date);

    const [issue] = await db.select({ id: epaperIssues.id }).from(epaperIssues)
      .where(and(
        eq(epaperIssues.siteId, site.id),
        eq(epaperIssues.status, "published"),
        eq(epaperIssues.edition, edition),
        gte(epaperIssues.issueDate, start),
        lt(epaperIssues.issueDate, end)
      )).limit(1);

    if (!issue) return res.status(404).json({ error: "No issue found for this date and edition" });
    res.json({ id: issue.id });
  } catch { res.status(500).json({ error: "Failed to resolve issue" }); }
});

// GET /api/epaper/calendar — dates with a published issue within a given month
router.get("/calendar", validateQuery(epaperCalendarQuerySchema), async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });

    const { month, edition } = req.query as any as { month: string; edition: string };
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));

    const rows = await db.selectDistinct({ issueDate: epaperIssues.issueDate }).from(epaperIssues)
      .where(and(
        eq(epaperIssues.siteId, site.id),
        eq(epaperIssues.status, "published"),
        eq(epaperIssues.edition, edition),
        gte(epaperIssues.issueDate, start),
        lt(epaperIssues.issueDate, end)
      ));

    res.json({ dates: rows.map((r) => r.issueDate) });
  } catch { res.status(500).json({ error: "Failed to fetch calendar" }); }
});

// GET /api/epaper/editions-for-date — one published issue per edition for a given date (defaults to each edition's latest)
router.get("/editions-for-date", validateQuery(epaperEditionsForDateQuerySchema), async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });

    const { date } = req.query as any as { date?: Date };

    let issues;
    if (date) {
      const [start, end] = dayRange(date);
      issues = await db.select().from(epaperIssues)
        .where(and(
          eq(epaperIssues.siteId, site.id),
          eq(epaperIssues.status, "published"),
          gte(epaperIssues.issueDate, start),
          lt(epaperIssues.issueDate, end)
        ))
        .orderBy(asc(epaperIssues.edition));
    } else {
      // No date given: return each edition's most recent published issue.
      const allIssues = await db.select().from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, site.id), eq(epaperIssues.status, "published")))
        .orderBy(desc(epaperIssues.issueDate));
      const seen = new Set<string>();
      issues = allIssues.filter((i) => {
        if (seen.has(i.edition)) return false;
        seen.add(i.edition);
        return true;
      });
    }

    res.json({ items: issues });
  } catch { res.status(500).json({ error: "Failed to fetch editions" }); }
});

// GET /api/epaper/:id — issue detail with pages (+ regions, + available editions for that date)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue || issue.status !== "published") return res.status(404).json({ error: "Issue not found" });

    const rawPages = await db.select().from(epaperPages).where(eq(epaperPages.issueId, id)).orderBy(asc(epaperPages.pageNumber));
    const pages = await attachRegions(rawPages);

    const [start, end] = dayRange(issue.issueDate);
    const editionRows = await db.selectDistinct({ edition: epaperIssues.edition }).from(epaperIssues)
      .where(and(
        eq(epaperIssues.siteId, issue.siteId),
        eq(epaperIssues.status, "published"),
        gte(epaperIssues.issueDate, start),
        lt(epaperIssues.issueDate, end)
      ));

    await db.update(epaperIssues).set({ viewsCount: sql`${epaperIssues.viewsCount} + 1` }).where(eq(epaperIssues.id, id));

    res.json({ ...issue, pages, availableEditions: editionRows.map((r) => r.edition) });
  } catch { res.status(500).json({ error: "Failed to fetch issue" }); }
});

// GET /api/epaper/:id/adjacent — neighboring published issue ids within the same edition (for date-stepper nav)
router.get("/:id/adjacent", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue || issue.status !== "published") return res.status(404).json({ error: "Issue not found" });

    const [[prev], [next]] = await Promise.all([
      db.select({ id: epaperIssues.id, issueDate: epaperIssues.issueDate }).from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, issue.siteId), eq(epaperIssues.status, "published"), eq(epaperIssues.edition, issue.edition), lt(epaperIssues.issueDate, issue.issueDate)))
        .orderBy(desc(epaperIssues.issueDate)).limit(1),
      db.select({ id: epaperIssues.id, issueDate: epaperIssues.issueDate }).from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, issue.siteId), eq(epaperIssues.status, "published"), eq(epaperIssues.edition, issue.edition), gt(epaperIssues.issueDate, issue.issueDate)))
        .orderBy(asc(epaperIssues.issueDate)).limit(1),
    ]);

    res.json({ prevId: prev?.id ?? null, nextId: next?.id ?? null });
  } catch { res.status(500).json({ error: "Failed to fetch adjacent issues" }); }
});

// GET /api/epaper/:id/pages/:pageId/clip — crop a region of a page's full-resolution image and stream it back
router.get("/:id/pages/:pageId/clip", validateQuery(epaperClipQuerySchema), async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const issueId = parseInt(req.params.id);
    if (isNaN(pageId) || isNaN(issueId)) return res.status(400).json({ error: "Invalid ID" });

    const [page] = await db.select().from(epaperPages).where(and(eq(epaperPages.id, pageId), eq(epaperPages.issueId, issueId))).limit(1);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const { x, y, width, height } = req.query as any as { x: number; y: number; width: number; height: number };

    const response = await fetch(page.imageUrl);
    if (!response.ok) return res.status(502).json({ error: "Failed to fetch source image" });
    const sourceBuffer = Buffer.from(await response.arrayBuffer());

    const metadata = await sharp(sourceBuffer).metadata();
    const imgWidth = metadata.width ?? 0;
    const imgHeight = metadata.height ?? 0;
    if (!imgWidth || !imgHeight) return res.status(500).json({ error: "Could not read source image dimensions" });

    const left = Math.max(0, Math.round(x * imgWidth));
    const top = Math.max(0, Math.round(y * imgHeight));
    const cropWidth = Math.min(imgWidth - left, Math.round(width * imgWidth));
    const cropHeight = Math.min(imgHeight - top, Math.round(height * imgHeight));
    if (cropWidth <= 0 || cropHeight <= 0) return res.status(400).json({ error: "Invalid crop dimensions" });

    const clipped = await sharp(sourceBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 90 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", `attachment; filename="epaper-clip-page-${page.pageNumber}.jpg"`);
    res.send(clipped);
  } catch { res.status(500).json({ error: "Failed to generate clip" }); }
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

// POST /api/epaper/admin/upload-pdf — create an issue from a single PDF; pages are sliced asynchronously
router.post("/admin/upload-pdf", requireAuth, requireEditor, pdfUpload.single("pdf"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });

    const { siteId, issueDate, edition, status } = req.body as Record<string, string>;
    if (!siteId || !issueDate) return res.status(400).json({ error: "siteId and issueDate are required" });

    const parsedSiteId = parseInt(siteId);
    const parsedDate = new Date(issueDate);
    if (isNaN(parsedSiteId) || isNaN(parsedDate.getTime())) return res.status(400).json({ error: "Invalid siteId or issueDate" });

    const [issue] = await db.insert(epaperIssues).values({
      siteId: parsedSiteId,
      issueDate: parsedDate,
      edition: edition?.trim() ?? "",
      status: (status === "published" ? "published" : "draft"),
      publishedAt: status === "published" ? new Date() : null,
      sourceType: "pdf",
      processingStatus: "processing",
    }).returning();

    const { url: pdfUrl, key: pdfSourceKey } = await uploadToS3(
      `epaper-pdfs/${Date.now()}-${issue.id}.pdf`,
      req.file.buffer,
      "application/pdf"
    );
    await db.update(epaperIssues).set({ pdfUrl, pdfSourceKey }).where(eq(epaperIssues.id, issue.id));

    res.status(202).json({ issueId: issue.id, processingStatus: "processing" });

    processPdfIssue(issue.id, req.file.buffer).catch(() => {
      // Failures are already recorded on the issue row by processPdfIssue itself.
    });
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "An issue already exists for this site, date, and edition" });
    res.status(500).json({ error: err?.message || "Failed to upload PDF" });
  }
});

// GET /api/epaper/admin/editions — distinct past editions used for a site (for a <datalist>)
router.get("/admin/editions", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { siteId } = req.query as any;
    if (!siteId) return res.status(400).json({ error: "siteId is required" });

    const rows = await db.selectDistinct({ edition: epaperIssues.edition }).from(epaperIssues)
      .where(and(eq(epaperIssues.siteId, parseInt(siteId)), sql`${epaperIssues.edition} != ''`))
      .orderBy(asc(epaperIssues.edition));

    res.json(rows.map((r) => r.edition));
  } catch { res.status(500).json({ error: "Failed to fetch editions" }); }
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

// GET /api/epaper/admin/:id/processing-status — poll PDF-slicing progress
router.get("/admin/:id/processing-status", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [issue] = await db.select({
      processingStatus: epaperIssues.processingStatus,
      processingError: epaperIssues.processingError,
    }).from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const [pageCountRow] = await db.select({ c: count() }).from(epaperPages).where(eq(epaperPages.issueId, id));

    res.json({ ...issue, pageCount: Number(pageCountRow?.c ?? 0) });
  } catch { res.status(500).json({ error: "Failed to fetch processing status" }); }
});

// POST /api/epaper/admin — create a new issue
router.post("/admin", requireAuth, requireEditor, validateBody(epaperIssueCreateSchema), async (req: Request, res: Response) => {
  try {
    const { siteId, issueDate, edition, coverImageUrl, pdfUrl, status } = req.body;

    const [issue] = await db.insert(epaperIssues).values({
      siteId,
      issueDate,
      edition: edition ?? "",
      coverImageUrl,
      pdfUrl,
      status: status || "draft",
      publishedAt: status === "published" ? new Date() : null,
    }).returning();

    res.status(201).json(issue);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "An issue already exists for this site, date, and edition" });
    if (err?.cause?.code === "23503") return res.status(400).json({ error: "Invalid site" });
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// PUT /api/epaper/admin/:id — update issue
router.put("/admin/:id", requireAuth, requireEditor, validateBody(epaperIssueUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { issueDate, edition, coverImageUrl, pdfUrl, status } = req.body;

    const [existing] = await db.select().from(epaperIssues).where(eq(epaperIssues.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Issue not found" });

    const updates: any = { updatedAt: new Date() };
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (edition !== undefined) updates.edition = edition;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (pdfUrl !== undefined) updates.pdfUrl = pdfUrl;
    if (status !== undefined) {
      updates.status = status;
      if (status === "published" && existing.status !== "published") updates.publishedAt = new Date();
    }

    const [issue] = await db.update(epaperIssues).set(updates).where(eq(epaperIssues.id, id)).returning();
    res.json(issue);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "An issue already exists for this site, date, and edition" });
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

// GET /api/epaper/admin/pages/:pageId/regions — list regions for a page
router.get("/admin/pages/:pageId/regions", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.pageId);
    if (isNaN(pageId)) return res.status(400).json({ error: "Invalid page ID" });

    const regions = await db.select().from(epaperPageRegions).where(eq(epaperPageRegions.pageId, pageId));
    res.json(regions);
  } catch { res.status(500).json({ error: "Failed to fetch regions" }); }
});

// POST /api/epaper/admin/pages/:pageId/regions — add a region hotspot to a page
router.post("/admin/pages/:pageId/regions", requireAuth, requireEditor, validateBody(epaperRegionCreateSchema), async (req: Request, res: Response) => {
  try {
    const pageId = parseInt(req.params.pageId);
    if (isNaN(pageId)) return res.status(400).json({ error: "Invalid page ID" });

    const [page] = await db.select().from(epaperPages).where(eq(epaperPages.id, pageId)).limit(1);
    if (!page) return res.status(404).json({ error: "Page not found" });

    const { articleId, externalUrl, x, y, width, height, label } = req.body;

    const [region] = await db.insert(epaperPageRegions).values({
      pageId, articleId, externalUrl, x, y, width, height, label,
    }).returning();

    res.status(201).json(region);
  } catch (err: any) {
    if (err?.cause?.code === "23503") return res.status(400).json({ error: "Invalid article" });
    res.status(500).json({ error: "Failed to add region" });
  }
});

// DELETE /api/epaper/admin/regions/:regionId
router.delete("/admin/regions/:regionId", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const regionId = parseInt(req.params.regionId);
    if (isNaN(regionId)) return res.status(400).json({ error: "Invalid region ID" });

    await db.delete(epaperPageRegions).where(eq(epaperPageRegions.id, regionId));
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete region" }); }
});

export default router;
