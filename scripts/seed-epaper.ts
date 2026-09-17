// Seeds e-paper issues (today + a few recent days, 2 editions) with real
// page images, for UI testing of the epaper listing/calendar/reader.
import "dotenv/config";
import { db } from "../src/config/db.js";
import { epaperIssues, epaperPages, sites } from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

const TARGET_SITE_SLUG = process.env.LOAD_TEST_SITE_SLUG || "bazar-karobar";
const EDITIONS = ["National", "City"];
const PAGES_PER_ISSUE = 8;
const DAYS_BACK = 5;

// Real, working placeholder "newspaper page" images (portrait aspect).
const PAGE_IMAGES = [
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=900&h=1200&fit=crop",
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&h=1200&fit=crop",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("Seeding e-paper issues...\n");

  const [site] = await db.select().from(sites).where(eq(sites.slug, TARGET_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`Site "${TARGET_SITE_SLUG}" not found`);
  console.log(`Seeding for site: ${site.name} (id ${site.id})\n`);

  let issuesCreated = 0;
  let pagesCreated = 0;

  for (let d = 0; d < DAYS_BACK; d++) {
    const issueDate = new Date();
    issueDate.setUTCHours(0, 0, 0, 0);
    issueDate.setUTCDate(issueDate.getUTCDate() - d);

    for (const edition of EDITIONS) {
      const [existing] = await db.select({ id: epaperIssues.id }).from(epaperIssues)
        .where(and(eq(epaperIssues.siteId, site.id), eq(epaperIssues.issueDate, issueDate), eq(epaperIssues.edition, edition)))
        .limit(1);
      if (existing) continue;

      const [issue] = await db.insert(epaperIssues).values({
        siteId: site.id,
        issueDate,
        edition,
        coverImageUrl: pick(PAGE_IMAGES, d),
        sourceType: "manual",
        status: "published",
        publishedAt: issueDate,
      }).returning({ id: epaperIssues.id });

      if (issue) {
        await db.insert(epaperPages).values(
          Array.from({ length: PAGES_PER_ISSUE }).map((_, p) => ({
            issueId: issue.id,
            pageNumber: p + 1,
            imageUrl: pick(PAGE_IMAGES, d + p),
            thumbnailUrl: pick(PAGE_IMAGES, d + p),
          }))
        );
        pagesCreated += PAGES_PER_ISSUE;
        issuesCreated++;
      }
    }
  }

  console.log(`✓ E-paper issues seeded: ${issuesCreated}`);
  console.log(`✓ E-paper pages seeded: ${pagesCreated}`);
  console.log("\nDone. Run `npm run cleanup:epaper` to remove all seeded issues for this site.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
