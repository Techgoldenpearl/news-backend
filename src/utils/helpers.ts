import { nanoid } from "nanoid";
import { and, eq, exists, isNull, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { articles, articleWebsites, categories, websiteCategories } from "../../drizzle/schema.js";

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-|-$/g, "");
}

export function generateUniqueSlug(text: string): string {
  return `${generateSlug(text)}-${nanoid(6)}`;
}

export function parsePagination(query: any): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(query.limit || "20", 10), 1), 100);
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const offset = (page - 1) * limit;
  return { limit, offset };
}

export function cookieOptions(secure: boolean = false) {
  return {
    httpOnly: true,
    secure,
    // Cross-site deployments (e.g. Vercel frontend + Render backend) require
    // SameSite=None for the browser to send the cookie at all; that value is
    // only valid when Secure is also set, so fall back to Lax for plain-HTTP
    // local dev.
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

export function sanitizeForLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

// Article belongs to a site if: linked via article_websites, OR (legacy) articles.siteId
// matches directly, OR the article is flagged isGlobal.
export function articleMatchesSite(siteId: number) {
  return or(
    exists(
      db.select({ id: articleWebsites.id }).from(articleWebsites)
        .where(and(eq(articleWebsites.articleId, articles.id), eq(articleWebsites.siteId, siteId)))
    ),
    eq(articles.siteId, siteId),
    eq(articles.isGlobal, true)
  )!;
}

// Category belongs to a site if: its own siteId matches (primary/home site), OR it's
// global (siteId null), OR it's been additionally linked to this site via
// website_categories (secondary sites, added on top of its primary/global assignment).
export function categoryMatchesSite(siteId: number) {
  return or(
    eq(categories.siteId, siteId),
    isNull(categories.siteId),
    exists(
      db.select({ id: websiteCategories.id }).from(websiteCategories)
        .where(and(eq(websiteCategories.categoryId, categories.id), eq(websiteCategories.siteId, siteId)))
    )
  )!;
}
