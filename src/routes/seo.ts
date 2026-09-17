import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { articles, categories, sites } from "../../drizzle/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { cacheGet, cacheSet, TTL } from "../config/redis.js";
import { articleMatchesSite } from "../utils/helpers.js";

const router = Router();

// GET /sitemap.xml
router.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    const baseUrl = site?.domain ? `https://${site.domain}` : `http://${req.hostname}`;
    const cacheKey = `sitemap:${site?.id ?? baseUrl}`;

    const cached = await cacheGet<string>(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=900, stale-while-revalidate=1800");
      return res.header("Content-Type", "application/xml").send(cached);
    }

    const articleConditions: any[] = [eq(articles.status, "published")];
    if (site) articleConditions.push(articleMatchesSite(site.id));

    const allArticles = await db
      .select({ slug: articles.slug, publishedAt: articles.publishedAt, updatedAt: articles.updatedAt })
      .from(articles)
      .where(and(...articleConditions))
      .orderBy(desc(articles.publishedAt))
      .limit(5000);

    const allCategories = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));

    const staticUrls = [
      { loc: baseUrl, changefreq: "hourly", priority: "1.0", lastmod: "" },
      ...allCategories.map((c) => ({ loc: `${baseUrl}/category/${c.slug}`, changefreq: "daily", priority: "0.8", lastmod: "" })),
    ];
    const articleUrls = allArticles.map((a) => ({
      loc: `${baseUrl}/article/${a.slug}`,
      lastmod: (a.updatedAt || a.publishedAt)?.toISOString().split("T")[0] || "",
      changefreq: "weekly",
      priority: "0.6",
    }));
    const urls = [...staticUrls, ...articleUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    cacheSet(cacheKey, xml, TTL.LONG).catch(() => {});
    res.set("Cache-Control", "public, max-age=900, stale-while-revalidate=1800");
    res.header("Content-Type", "application/xml").send(xml);
  } catch (err) {
    res.status(500).send("<!-- Error generating sitemap -->");
  }
});

// GET /robots.txt
router.get("/robots.txt", (req: Request, res: Response) => {
  const baseUrl = `http://${req.hostname}`;
  res.set("Cache-Control", "public, max-age=3600");
  res.header("Content-Type", "text/plain").send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /login
Disallow: /register

Sitemap: ${baseUrl}/sitemap.xml
`);
});

// GET /api/seo/article/:slug — JSON-LD structured data for an article
router.get("/article/:slug", async (req: Request, res: Response) => {
  try {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, req.params.slug))
      .limit(1);

    if (!article) return res.status(404).json(null);

    const site = (req as any).site;
    const baseUrl = site?.domain ? `https://${site.domain}` : `http://${req.hostname}`;

    const [category] = article.categoryId
      ? await db.select().from(categories).where(eq(categories.id, article.categoryId)).limit(1)
      : [null];

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.summary || article.title,
      image: article.thumbnailUrl ? [article.thumbnailUrl] : [],
      datePublished: article.publishedAt?.toISOString(),
      dateModified: article.updatedAt?.toISOString(),
      url: `${baseUrl}/article/${article.slug}`,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/article/${article.slug}` },
      publisher: {
        "@type": "Organization",
        name: site?.name || "News Platform",
        logo: { "@type": "ImageObject", url: site?.logoUrl || `${baseUrl}/logo.png` },
      },
      articleSection: category?.name,
      wordCount: article.content ? article.content.replace(/<[^>]+>/g, "").split(/\s+/).length : 0,
      isAccessibleForFree: !article.isPremium,
      ...(article.isPremium && {
        hasPart: {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: ".paywall",
        },
      }),
    };

    res.json(jsonLd);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate structured data" });
  }
});

// GET /api/seo/site — site-level JSON-LD
router.get("/site", async (req: Request, res: Response) => {
  try {
    const site = (req as any).site;
    const baseUrl = site?.domain ? `https://${site.domain}` : `http://${req.hostname}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site?.name || "News Platform",
      url: baseUrl,
      description: site?.description || "News Platform",
      potentialAction: {
        "@type": "SearchAction",
        target: `${baseUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      publisher: {
        "@type": "Organization",
        name: site?.name || "News Platform",
        logo: { "@type": "ImageObject", url: site?.logoUrl || `${baseUrl}/logo.png` },
      },
    };

    res.json(jsonLd);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
