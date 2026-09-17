// Links published articles to the existing `tags` (Breaking News, Elections,
// Cricket, Bollywood, Budget, Weather, COVID-19, IPL) via `article_tags`, so
// the trending-tags endpoint (GET /features/tags) has real data to rank by
// instead of returning an empty list. Matches by category + title keywords;
// re-runnable safely (skips pairs that already exist).
import "dotenv/config";
import { db } from "../src/config/db.js";
import { articles, tags, articleTags, categories } from "../drizzle/schema.js";
import { eq, and, inArray } from "drizzle-orm";

const CATEGORY_SLUG_TO_TAGS: Record<string, string[]> = {
  sports: ["Cricket", "IPL"],
  entertainment: ["Bollywood"],
  politics: ["Elections"],
  Politics: ["Elections"],
  business: ["Budget"],
  health: ["COVID-19"],
};

const KEYWORD_TO_TAG: [RegExp, string][] = [
  [/election|poll|vote|by-election/i, "Elections"],
  [/cricket|ipl|t20|odi/i, "Cricket"],
  [/ipl/i, "IPL"],
  [/bollywood|film|movie|actor|actress/i, "Bollywood"],
  [/budget|tax|fiscal/i, "Budget"],
  [/rain|monsoon|weather|heat|cold wave|cyclone/i, "Weather"],
  [/covid|pandemic|coronavirus/i, "COVID-19"],
];

async function main() {
  const allTags = await db.select().from(tags);
  const tagIdByName = new Map(allTags.map((t) => [t.name, t.id]));

  const allCategories = await db.select().from(categories);
  const categorySlugById = new Map(allCategories.map((c) => [c.id, c.slug]));

  const pubArticles = await db.select({
    id: articles.id, title: articles.title, categoryId: articles.categoryId, isBreaking: articles.isBreaking,
  }).from(articles).where(eq(articles.status, "published"));

  const existing = await db.select().from(articleTags);
  const existingPairs = new Set(existing.map((e) => `${e.articleId}:${e.tagId}`));

  const toInsert: { articleId: number; tagId: number }[] = [];

  for (const a of pubArticles) {
    const tagNames = new Set<string>();

    if (a.isBreaking) tagNames.add("Breaking News");

    const slug = a.categoryId ? categorySlugById.get(a.categoryId) : undefined;
    if (slug && CATEGORY_SLUG_TO_TAGS[slug]) {
      for (const t of CATEGORY_SLUG_TO_TAGS[slug]) tagNames.add(t);
    }

    for (const [re, tagName] of KEYWORD_TO_TAG) {
      if (re.test(a.title)) tagNames.add(tagName);
    }

    for (const name of tagNames) {
      const tagId = tagIdByName.get(name);
      if (!tagId) continue;
      const key = `${a.id}:${tagId}`;
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      toInsert.push({ articleId: a.id, tagId });
    }
  }

  if (toInsert.length === 0) {
    console.log("Nothing to insert — all matched pairs already exist.");
    return;
  }

  await db.insert(articleTags).values(toInsert);
  console.log(`Inserted ${toInsert.length} article-tag links across ${pubArticles.length} published articles.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
