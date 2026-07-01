import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { categories } from "../../drizzle/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/categories
router.get("/", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : (req as any).site?.id;

    const conditions: any[] = [];
    if (activeOnly) conditions.push(eq(categories.isActive, true));
    if (siteId) conditions.push(eq(categories.siteId, siteId));

    const items = await db
      .select()
      .from(categories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(categories.sortOrder));

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
    if (siteId) conditions.push(eq(categories.siteId, siteId));

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
    const [newCat] = await db
      .insert(categories)
      .values({ ...req.body, isActive: true })
      .returning();
    res.status(201).json(newCat);
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id
router.put("/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(categories).set({ ...req.body, updatedAt: new Date() }).where(eq(categories.id, id));
    res.json({ success: true });
  } catch (err) {
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

export default router;
