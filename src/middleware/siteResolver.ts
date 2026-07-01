import { Request, Response, NextFunction } from "express";
import { db } from "../config/db.js";
import { sites } from "../../drizzle/schema.js";
import { eq, or } from "drizzle-orm";

const siteCache = new Map<string, { site: any; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function siteResolver(req: Request, _res: Response, next: NextFunction) {
  try {
    const hostname = req.hostname;
    const siteSlug = req.headers["x-site-id"] as string | undefined;

    const cacheKey = siteSlug || hostname;
    const cached = siteCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      (req as any).site = cached.site;
      return next();
    }

    let site: any = null;

    if (siteSlug) {
      const isNumeric = /^\d+$/.test(siteSlug);
      const [result] = await db
        .select()
        .from(sites)
        .where(isNumeric ? eq(sites.id, parseInt(siteSlug)) : eq(sites.slug, siteSlug))
        .limit(1);
      site = result ?? null;
    }

    if (!site) {
      const [result] = await db
        .select()
        .from(sites)
        .where(
          or(eq(sites.domain, hostname), eq(sites.subdomain, hostname))
        )
        .limit(1);
      site = result ?? null;
    }

    if (site) {
      siteCache.set(cacheKey, { site, cachedAt: Date.now() });
    }

    (req as any).site = site;
  } catch {
    // Don't block request if site resolution fails
  }
  next();
}

export function clearSiteCache() {
  siteCache.clear();
}
