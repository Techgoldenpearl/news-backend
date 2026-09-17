// Removes everything inserted by seed-shok-sandesh.ts for the target site.
// The shok_sandesh table has no slug/name column to prefix-match against
// (unlike articles/galleries/ads), so this identifies seeded rows by
// matching the exact seeded deceasedName values instead.
import "dotenv/config";
import { db } from "../src/config/db.js";
import { shokSandesh, sites } from "../drizzle/schema.js";
import { eq, inArray, and } from "drizzle-orm";

const TARGET_SITE_SLUG = process.env.LOAD_TEST_SITE_SLUG || "bazar-karobar";

const SEEDED_NAMES = [
  "Ramesh Chandra Sharma", "Kamla Devi", "Dr. Vinod Kumar Gupta", "Manohar Lal Joshi",
  "Sushila Bai Patel", "Colonel (Retd.) Ashok Singh Rathore", "Prakash Chandra Verma",
  "Meera Bai Chauhan", "Harish Chandra Mishra",
];

async function main() {
  console.log("Cleaning up seeded shok-sandesh entries...\n");

  const [site] = await db.select().from(sites).where(eq(sites.slug, TARGET_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`Site "${TARGET_SITE_SLUG}" not found`);

  const deleted = await db.delete(shokSandesh)
    .where(and(eq(shokSandesh.siteId, site.id), inArray(shokSandesh.deceasedName, SEEDED_NAMES)))
    .returning({ id: shokSandesh.id });

  console.log(`✓ Shok-sandesh entries removed: ${deleted.length}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
