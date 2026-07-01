import { db } from "../config/db.js";
import { sql } from "drizzle-orm";

export async function setupFullTextSearch() {
  try {
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_articles_fts'
        ) THEN
          ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
              setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
              setweight(to_tsvector('simple', coalesce(title_hindi, '')), 'A') ||
              setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
              setweight(to_tsvector('simple', coalesce(content, '')), 'C')
            ) STORED;
          CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);
        END IF;
      END $$;
    `);
    console.log("[Search] Full-text search index ready");
  } catch (err) {
    console.warn("[Search] Could not set up FTS (may already exist):", (err as any).message);
  }
}

export async function fullTextSearch(query: string, limit: number = 20, offset: number = 0, siteId?: number) {
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w + ":*")
    .join(" & ");

  if (!tsQuery) return { items: [], total: 0 };

  const siteFilter = siteId ? sql`AND (a.site_id = ${siteId} OR a.is_global = true)` : sql``;

  const results = await db.execute(sql`
    SELECT
      a.id, a.title, a.title_hindi, a.slug, a.summary,
      a.thumbnail_url, a.published_at, a.views_count,
      a.is_breaking, a.content_type,
      c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
      ts_rank(a.search_vector, to_tsquery('simple', ${tsQuery})) AS rank
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'published'
      AND a.search_vector @@ to_tsquery('simple', ${tsQuery})
      ${siteFilter}
    ORDER BY rank DESC, a.published_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM articles a
    WHERE a.status = 'published'
      AND a.search_vector @@ to_tsquery('simple', ${tsQuery})
      ${siteFilter}
  `);

  const rows = (results as any).rows ?? results;
  const countRows = (countResult as any).rows ?? countResult;

  return {
    items: rows,
    total: Number(countRows?.[0]?.total ?? 0),
  };
}
