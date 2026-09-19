import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { categories, websiteCategories } from "../../drizzle/schema.js";
import { eq, and, asc, isNull, ne } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { websiteCategoryUpsertSchema } from "../validations/index.js";
import { categoryMatchesSite } from "../utils/helpers.js";

const router = Router();

// GET /api/categories
router.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;

    const conditions: any[] = [];
    if (activeOnly) conditions.push(eq(categories.isActive, true));
    if (siteId) conditions.push(categoryMatchesSite(siteId));

    if (!siteId) {
      const items = await db
        .select()
        .from(categories)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(categories.sortOrder));
      return res.json(items);
    }

    const rows = await db
      .select({
        id: categories.id,
        siteId: categories.siteId,
        name: categories.name,
        nameHindi: categories.nameHindi,
        slug: categories.slug,
        description: categories.description,
        iconUrl: categories.iconUrl,
        color: categories.color,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        showInNav: categories.showInNav,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        overrideDisplayName: websiteCategories.displayName,
        overrideDisplayOrder: websiteCategories.displayOrder,
        overrideIsVisible: websiteCategories.isVisible,
      })
      .from(categories)
      .leftJoin(
        websiteCategories,
        and(eq(websiteCategories.categoryId, categories.id), eq(websiteCategories.siteId, siteId))
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(categories.sortOrder));

    const items = rows
      .filter((r) => r.overrideIsVisible !== false)
      .map((r) => ({
        ...r,
        name: r.overrideDisplayName || r.name,
        sortOrder: r.overrideDisplayOrder ?? r.sortOrder,
      }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/categories/:slug
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;
    const conditions: any[] = [eq(categories.slug, req.params.slug)];
    if (siteId) conditions.push(categoryMatchesSite(siteId));

    const [cat] = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// POST /api/categories
router.post("/", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { slug, siteId } = req.body;
    const dupeConditions = [eq(categories.slug, slug)];
    dupeConditions.push(siteId ? eq(categories.siteId, siteId) : isNull(categories.siteId));
    const [existing] = await db.select({ id: categories.id }).from(categories).where(and(...dupeConditions)).limit(1);
    if (existing) return res.status(409).json({ error: "A category with this slug already exists for this site" });

    const [newCat] = await db
      .insert(categories)
      .values({ ...req.body, isActive: true })
      .returning();
    res.status(201).json(newCat);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A category with this slug already exists for this site" });
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { slug, siteId } = req.body;

    if (slug !== undefined) {
      const dupeConditions = [eq(categories.slug, slug), ne(categories.id, id)];
      dupeConditions.push(siteId ? eq(categories.siteId, siteId) : isNull(categories.siteId));
      const [existing] = await db.select({ id: categories.id }).from(categories).where(and(...dupeConditions)).limit(1);
      if (existing) return res.status(409).json({ error: "A category with this slug already exists for this site" });
    }

    await db.update(categories).set({ ...req.body, updatedAt: new Date() }).where(eq(categories.id, id));
    res.json({ success: true });
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A category with this slug already exists for this site" });
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id
router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(categories).where(eq(categories.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// GET /api/categories/:id/websites — list existing per-site overrides for a category
router.get("/:id/websites", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    const rows = await db
      .select({
        siteId: websiteCategories.siteId,
        displayName: websiteCategories.displayName,
        displayOrder: websiteCategories.displayOrder,
        isVisible: websiteCategories.isVisible,
      })
      .from(websiteCategories)
      .where(eq(websiteCategories.categoryId, categoryId));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch website category overrides" });
  }
});

// PUT /api/categories/:id/websites/:siteId — upsert a per-site display override
router.put(
  "/:id/websites/:siteId",
  requireAuth,
  requireEditor,
  validateBody(websiteCategoryUpsertSchema),
  async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      const siteId = parseInt(req.params.siteId);
      const { displayName, displayOrder, isVisible } = req.body;

      const [existing] = await db
        .select({ id: websiteCategories.id })
        .from(websiteCategories)
        .where(and(eq(websiteCategories.categoryId, categoryId), eq(websiteCategories.siteId, siteId)))
        .limit(1);

      if (existing) {
        await db
          .update(websiteCategories)
          .set({
            ...(displayName !== undefined && { displayName: displayName || null }),
            ...(displayOrder !== undefined && { displayOrder }),
            ...(isVisible !== undefined && { isVisible }),
          })
          .where(eq(websiteCategories.id, existing.id));
      } else {
        await db.insert(websiteCategories).values({
          categoryId,
          siteId,
          displayName: displayName || null,
          displayOrder: displayOrder ?? 0,
          isVisible: isVisible ?? true,
        });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update website category override" });
    }
  }
);

// DELETE /api/categories/:id/websites/:siteId — remove a per-site override (revert to defaults)
router.delete("/:id/websites/:siteId", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    const siteId = parseInt(req.params.siteId);
    await db
      .delete(websiteCategories)
      .where(and(eq(websiteCategories.categoryId, categoryId), eq(websiteCategories.siteId, siteId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove website category override" });
  }
});

export default router;
