import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { articles, categories, sites } from "../../drizzle/schema.js";
import { eq, and, desc, or } from "drizzle-orm";

const router = Router();

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

// GET /feed/rss — main RSS feed
router.get("/rss", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    const baseUrl = site?.domain ? `https://${site.domain}` : `http://${req.hostname}`;
    const siteName = site?.name || "News Platform";

    const conditions: any[] = [eq(articles.status, "published")];
    if (site) conditions.push(or(eq(articles.siteId, site.id), eq(articles.isGlobal, true)));

    const items = await db
      .select({
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        content: articles.content,
        thumbnailUrl: articles.thumbnailUrl,
        publishedAt: articles.publishedAt,
        categoryName: categories.name,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt))
      .limit(50);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>${escapeXml(siteName)}</title>
  <link>${baseUrl}</link>
  <description>${escapeXml(site?.description || "Latest News")}</description>
  <language>${site?.language || "hi"}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/feed/rss" rel="self" type="application/rss+xml"/>
${items.map((item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${baseUrl}/article/${item.slug}</link>
    <guid isPermaLink="true">${baseUrl}/article/${item.slug}</guid>
    <description>${escapeXml(item.summary || stripHtml(item.content || "").slice(0, 300))}</description>
    ${item.categoryName ? `<category>${escapeXml(item.categoryName)}</category>` : ""}
    ${item.publishedAt ? `<pubDate>${item.publishedAt.toUTCString()}</pubDate>` : ""}
    ${item.thumbnailUrl ? `<media:content url="${escapeXml(item.thumbnailUrl)}" medium="image"/>` : ""}
  </item>`).join("\n")}
</channel>
</rss>`;

    res.header("Content-Type", "application/rss+xml; charset=utf-8").send(rss);
  } catch (err) {
    res.status(500).send("<!-- Error generating RSS -->");
  }
});

// GET /feed/rss/category/:slug — category-specific RSS
router.get("/rss/category/:slug", async (req: Request, res: Response) => {
  try {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, req.params.slug)).limit(1);
    if (!cat) return res.status(404).send("<!-- Category not found -->");

    const site = (req as any).site;
    const baseUrl = site?.domain ? `https://${site.domain}` : `http://${req.hostname}`;

    const items = await db
      .select({
        title: articles.title,
        slug: articles.slug,
        summary: articles.summary,
        thumbnailUrl: articles.thumbnailUrl,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(and(eq(articles.status, "published"), eq(articles.categoryId, cat.id)))
      .orderBy(desc(articles.publishedAt))
      .limit(30);

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(cat.nameHindi || cat.name)} - ${site?.name || "News"}</title>
  <link>${baseUrl}/category/${cat.slug}</link>
  <description>${escapeXml(cat.description || cat.name)}</description>
  <language>${site?.language || "hi"}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${baseUrl}/feed/rss/category/${cat.slug}" rel="self" type="application/rss+xml"/>
${items.map((item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${baseUrl}/article/${item.slug}</link>
    <guid isPermaLink="true">${baseUrl}/article/${item.slug}</guid>
    <description>${escapeXml(item.summary || "")}</description>
    ${item.publishedAt ? `<pubDate>${item.publishedAt.toUTCString()}</pubDate>` : ""}
  </item>`).join("\n")}
</channel>
</rss>`;

    res.header("Content-Type", "application/rss+xml; charset=utf-8").send(rss);
  } catch (err) {
    res.status(500).send("<!-- Error generating RSS -->");
  }
});

export default router;
