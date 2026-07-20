import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { states, cities } from "../../drizzle/schema.js";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireEditor, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { stateCreateSchema, stateUpdateSchema, cityCreateSchema, cityUpdateSchema } from "../validations/index.js";

const router = Router();

// GET /api/locations/states
router.get("/states", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const items = await db
      .select()
      .from(states)
      .where(activeOnly ? eq(states.isActive, true) : undefined)
      .orderBy(asc(states.sortOrder));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch states" });
  }
});

// POST /api/locations/states
router.post("/states", requireAuth, requireEditor, validateBody(stateCreateSchema), async (req: Request, res: Response) => {
  try {
    const [newState] = await db
      .insert(states)
      .values({ ...req.body, isActive: req.body.isActive ?? true })
      .returning();
    res.status(201).json(newState);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A state with this slug already exists" });
    res.status(500).json({ error: "Failed to create state" });
  }
});

// PUT /api/locations/states/:id
router.put("/states/:id", requireAuth, requireEditor, validateBody(stateUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(states).set(req.body).where(eq(states.id, id));
    res.json({ success: true });
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A state with this slug already exists" });
    res.status(500).json({ error: "Failed to update state" });
  }
});

// DELETE /api/locations/states/:id
router.delete("/states/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(states).where(eq(states.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete state" });
  }
});

// GET /api/locations/cities
router.get("/cities", async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const stateId = req.query.stateId ? parseInt(req.query.stateId as string) : undefined;

    const conditions: any[] = [];
    if (activeOnly) conditions.push(eq(cities.isActive, true));
    if (stateId) conditions.push(eq(cities.stateId, stateId));

    const items = await db
      .select()
      .from(cities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(cities.sortOrder));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

// POST /api/locations/cities
router.post("/cities", requireAuth, requireEditor, validateBody(cityCreateSchema), async (req: Request, res: Response) => {
  try {
    const [newCity] = await db
      .insert(cities)
      .values({ ...req.body, isActive: req.body.isActive ?? true })
      .returning();
    res.status(201).json(newCity);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A city with this slug already exists" });
    if (err?.cause?.code === "23503") return res.status(400).json({ error: "State not found" });
    res.status(500).json({ error: "Failed to create city" });
  }
});

// PUT /api/locations/cities/:id
router.put("/cities/:id", requireAuth, requireEditor, validateBody(cityUpdateSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(cities).set(req.body).where(eq(cities.id, id));
    res.json({ success: true });
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A city with this slug already exists" });
    if (err?.cause?.code === "23503") return res.status(400).json({ error: "State not found" });
    res.status(500).json({ error: "Failed to update city" });
  }
});

// DELETE /api/locations/cities/:id
router.delete("/cities/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(cities).where(eq(cities.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete city" });
  }
});

export default router;
