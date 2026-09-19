import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { sites, siteSettings } from "../../drizzle/schema.js";
import { eq, and, ne, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { clearSiteCache } from "../middleware/siteResolver.js";

const router = Router();

// GET /api/sites — list all sites
router.get("/", async (_req: Request, res: Response) => {
  try {
    const allSites = await db.select().from(sites).orderBy(sites.name);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(allSites);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sites" });
  }
});

// GET /api/sites/resolve?domain=x — resolve domain to site config
router.get("/resolve", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    if (!site) return res.status(404).json({ error: "Site not found" });
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(site);
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve site" });
  }
});

// GET /api/sites/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [site] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, parseInt(req.params.id)))
      .limit(1);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const settings = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteId, site.id));

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json({ ...site, settings });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site" });
  }
});

// POST /api/sites — create site (admin)
router.post("/", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, subdomain, logoUrl, faviconUrl, description, language, region, theme, socialLinks, seoDefaults } = req.body;
    const domain = req.body.domain || null;

    const dupeConditions = [eq(sites.slug, slug)];
    if (domain) dupeConditions.push(eq(sites.domain, domain));
    const [existing] = await db.select({ id: sites.id, slug: sites.slug, domain: sites.domain }).from(sites).where(or(...dupeConditions)).limit(1);
    if (existing) {
      const field = existing.slug === slug ? "slug" : "domain";
      return res.status(409).json({ error: `A site with this ${field} already exists` });
    }

    const [newSite] = await db
      .insert(sites)
      .values({ name, slug, domain, subdomain, logoUrl, faviconUrl, description, language, region, theme, socialLinks, seoDefaults })
      .returning();

    clearSiteCache();
    res.status(201).json(newSite);
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A site with this slug or domain already exists" });
    console.error("[Sites] Create error:", err);
    res.status(500).json({ error: "Failed to create site" });
  }
});

// PUT /api/sites/:id — update site (admin)
router.put("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, subdomain, logoUrl, faviconUrl, description, language, region, theme, socialLinks, seoDefaults, isActive } = req.body;
    const domain = req.body.domain !== undefined ? (req.body.domain || null) : undefined;

    if (slug || domain) {
      const dupeConditions = [];
      if (slug) dupeConditions.push(eq(sites.slug, slug));
      if (domain) dupeConditions.push(eq(sites.domain, domain));
      const [existing] = await db
        .select({ id: sites.id, slug: sites.slug, domain: sites.domain })
        .from(sites)
        .where(and(or(...dupeConditions), ne(sites.id, id)))
        .limit(1);
      if (existing) {
        const field = slug && existing.slug === slug ? "slug" : "domain";
        return res.status(409).json({ error: `A site with this ${field} already exists` });
      }
    }

    await db
      .update(sites)
      .set({
        ...(name && { name }),
        ...(slug && { slug }),
        ...(domain !== undefined && { domain }),
        ...(subdomain !== undefined && { subdomain }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(description !== undefined && { description }),
        ...(language && { language }),
        ...(region !== undefined && { region }),
        ...(theme && { theme }),
        ...(socialLinks && { socialLinks }),
        ...(seoDefaults && { seoDefaults }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(sites.id, id));

    clearSiteCache();
    res.json({ success: true });
  } catch (err: any) {
    if (err?.cause?.code === "23505") return res.status(409).json({ error: "A site with this slug or domain already exists" });
    res.status(500).json({ error: "Failed to update site" });
  }
});

// DELETE /api/sites/:id (super_admin)
router.delete("/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(sites).where(eq(sites.id, parseInt(req.params.id)));
    clearSiteCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete site" });
  }
});

// PUT /api/sites/:id/settings — upsert site setting
router.put("/:id/settings", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const siteId = parseInt(req.params.id);
    const { key, value } = req.body;

    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .limit(1);

    if (existing) {
      await db.update(siteSettings).set({ value, updatedAt: new Date() }).where(eq(siteSettings.id, existing.id));
    } else {
      await db.insert(siteSettings).values({ siteId, key, value });
    }

    clearSiteCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update site setting" });
  }
});

export default router;
