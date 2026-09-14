// Removes everything inserted by scripts/seed-load-test.ts, identified by
// the LOAD_TEST_MARKER prefix on slug/name. Safe to run any time — no-ops
// if nothing matches.
import "dotenv/config";
import { db } from "../src/config/db.js";
import { articles, photoGalleries, galleryImages, webStories, ads } from "../drizzle/schema.js";
import { like, inArray, eq } from "drizzle-orm";
import { LOAD_TEST_MARKER } from "./load-test-marker.js";

async function main() {
  console.log("Cleaning up load-test content...\n");

  const articlesDeleted = await db.delete(articles).where(like(articles.slug, `${LOAD_TEST_MARKER}%`)).returning({ id: articles.id });
  console.log(`✓ Articles removed: ${articlesDeleted.length}`);

  const galleryRows = await db.select({ id: photoGalleries.id }).from(photoGalleries).where(like(photoGalleries.slug, `${LOAD_TEST_MARKER}%`));
  if (galleryRows.length) {
    await db.delete(galleryImages).where(inArray(galleryImages.galleryId, galleryRows.map((g) => g.id)));
  }
  const galleriesDeleted = await db.delete(photoGalleries).where(like(photoGalleries.slug, `${LOAD_TEST_MARKER}%`)).returning({ id: photoGalleries.id });
  console.log(`✓ Photo galleries removed: ${galleriesDeleted.length}`);

  const storiesDeleted = await db.delete(webStories).where(like(webStories.slug, `${LOAD_TEST_MARKER}%`)).returning({ id: webStories.id });
  console.log(`✓ Web stories removed: ${storiesDeleted.length}`);

  const adsDeleted = await db.delete(ads).where(like(ads.name, `${LOAD_TEST_MARKER}%`)).returning({ id: ads.id });
  console.log(`✓ Ads removed: ${adsDeleted.length}`);

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
