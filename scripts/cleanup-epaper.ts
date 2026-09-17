// Removes epaper issues (and cascaded pages) seeded by seed-epaper.ts for
// the target site, identified by edition name ("National"/"City" — real
// editions for this site are expected to use different names).
import "dotenv/config";
import { db } from "../src/config/db.js";
import { epaperIssues, sites } from "../drizzle/schema.js";
import { eq, and, inArray } from "drizzle-orm";

const TARGET_SITE_SLUG = process.env.LOAD_TEST_SITE_SLUG || "bazar-karobar";
const EDITIONS = ["National", "City"];

async function main() {
  console.log("Cleaning up seeded e-paper issues...\n");

  const [site] = await db.select().from(sites).where(eq(sites.slug, TARGET_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`Site "${TARGET_SITE_SLUG}" not found`);

  const deleted = await db.delete(epaperIssues)
    .where(and(eq(epaperIssues.siteId, site.id), inArray(epaperIssues.edition, EDITIONS)))
    .returning({ id: epaperIssues.id });

  console.log(`✓ E-paper issues removed: ${deleted.length} (pages cascade-deleted)`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
