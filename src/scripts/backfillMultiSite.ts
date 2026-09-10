import "dotenv/config";
import { db } from "../config/db.js";
import { articles, sites, articleWebsites, articleLocations, states, cities } from "../../drizzle/schema.js";
import { eq, isNotNull, isNull, sql } from "drizzle-orm";

// One-off backfill: populate the new article_websites / article_locations join
// tables from the legacy articles.siteId / isGlobal / state / city columns.
// Safe to re-run — uses onConflictDoNothing and skips articles already migrated.
async function backfill() {
  console.log("Backfilling article_websites and article_locations...\n");

  // 1) articles.siteId -> article_websites
  const withSite = await db
    .select({ id: articles.id, siteId: articles.siteId })
    .from(articles)
    .where(isNotNull(articles.siteId));

  let siteLinked = 0;
  for (const a of withSite) {
    if (!a.siteId) continue;
    const res = await db
      .insert(articleWebsites)
      .values({ articleId: a.id, siteId: a.siteId })
      .onConflictDoNothing()
      .returning({ id: articleWebsites.id });
    if (res.length) siteLinked++;
  }
  console.log(`✓ Linked ${siteLinked} articles via existing siteId`);

  // 2) isGlobal articles -> linked to every active site
  const allSites = await db.select({ id: sites.id }).from(sites).where(eq(sites.isActive, true));
  const globalArticles = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.isGlobal, true));

  let globalLinked = 0;
  for (const a of globalArticles) {
    for (const s of allSites) {
      const res = await db
        .insert(articleWebsites)
        .values({ articleId: a.id, siteId: s.id })
        .onConflictDoNothing()
        .returning({ id: articleWebsites.id });
      if (res.length) globalLinked++;
    }
  }
  console.log(`✓ Linked ${globalArticles.length} global articles to ${allSites.length} sites (${globalLinked} new rows)`);

  // 3) articles.state / articles.city free text -> article_locations (best-effort name match)
  const allStates = await db.select().from(states);
  const allCities = await db.select().from(cities);
  const stateByName = new Map(allStates.map((s) => [s.name.trim().toLowerCase(), s]));
  const cityByName = new Map(allCities.map((c) => [c.name.trim().toLowerCase(), c]));

  const withLocation = await db
    .select({ id: articles.id, state: articles.state, city: articles.city })
    .from(articles)
    .where(sql`(${articles.state} is not null and ${articles.state} != '') or (${articles.city} is not null and ${articles.city} != '')`);

  let locationLinked = 0;
  const unmatched: { articleId: number; state: string | null; city: string | null }[] = [];

  for (const a of withLocation) {
    const matchedState = a.state ? stateByName.get(a.state.trim().toLowerCase()) : undefined;
    const matchedCity = a.city ? cityByName.get(a.city.trim().toLowerCase()) : undefined;

    if (!matchedState && !matchedCity) {
      unmatched.push({ articleId: a.id, state: a.state, city: a.city });
      continue;
    }

    await db.insert(articleLocations).values({
      articleId: a.id,
      stateId: matchedState?.id ?? null,
      cityId: matchedCity?.id ?? null,
    });
    locationLinked++;
  }

  console.log(`✓ Linked ${locationLinked} articles to states/cities`);
  if (unmatched.length) {
    console.log(`⚠ ${unmatched.length} articles had state/city text that didn't match any known state/city (left unlinked, for manual cleanup):`);
    for (const u of unmatched.slice(0, 20)) {
      console.log(`   article #${u.articleId}: state="${u.state ?? ""}" city="${u.city ?? ""}"`);
    }
    if (unmatched.length > 20) console.log(`   ...and ${unmatched.length - 20} more`);
  }

  console.log("\nDone.");
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
