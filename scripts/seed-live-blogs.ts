// Adds live blogs + entries to breaking articles that don't already have
// one, so the home page's live-updates feed has enough real cards to test
// (matches the pattern already used for the hero's single live blog).
// Re-runnable safely — skips articles that already have a live blog.
import "dotenv/config";
import { db } from "../src/config/db.js";
import { articles, liveBlogs, liveBlogEntries } from "../drizzle/schema.js";
import { eq, inArray } from "drizzle-orm";

const ENTRY_TEMPLATES = [
  { content: "Officials confirmed the situation is being closely monitored.", contentHindi: "अधिकारियों ने पुष्टि की कि स्थिति पर करीबी नजर रखी जा रही है।" },
  { content: "Local authorities have issued an update on the developing story.", contentHindi: "स्थानीय अधिकारियों ने घटनाक्रम पर ताज़ा जानकारी जारी की।" },
  { content: "Eyewitnesses shared new details as the story continues to develop.", contentHindi: "प्रत्यक्षदर्शियों ने घटनाक्रम पर नई जानकारी साझा की।" },
];

async function main() {
  const breaking = await db.select({ id: articles.id }).from(articles).where(eq(articles.isBreaking, true));
  const breakingIds = breaking.map((a) => a.id);
  if (breakingIds.length === 0) {
    console.log("No breaking articles found.");
    return;
  }

  const existing = await db.select({ articleId: liveBlogs.articleId }).from(liveBlogs)
    .where(inArray(liveBlogs.articleId, breakingIds));
  const existingIds = new Set(existing.map((e) => e.articleId));

  const toSeed = breakingIds.filter((id) => !existingIds.has(id));
  if (toSeed.length === 0) {
    console.log("All breaking articles already have a live blog.");
    return;
  }

  let created = 0;
  for (const articleId of toSeed) {
    const [blog] = await db.insert(liveBlogs).values({ articleId, isLive: true }).returning();
    const now = Date.now();
    const entryRows = ENTRY_TEMPLATES.slice(0, 2).map((t, i) => ({
      liveBlogId: blog.id,
      content: t.content,
      contentHindi: t.contentHindi,
      postedAt: new Date(now - (i + 1) * 20 * 60 * 1000),
    }));
    await db.insert(liveBlogEntries).values(entryRows);
    created++;
  }

  console.log(`Created ${created} live blogs (with 2 entries each) on previously-unblogged breaking articles.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
