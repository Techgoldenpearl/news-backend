// Standalone load-test seeder — NOT part of the production seed.
// Inserts 50+ marked test articles across all categories, a few photo
// galleries / web stories, and one ad per zone, so the home page can be
// exercised under realistic content volume. Every row's slug/name is
// prefixed with LOAD_TEST_MARKER so scripts/cleanup-load-test.ts can find
// and remove them afterward without touching real content.
import "dotenv/config";
import { db } from "../src/config/db.js";
import {
  articles, categories, users, sites, photoGalleries, galleryImages, webStories, ads,
} from "../drizzle/schema.js";
import { eq, or, isNull } from "drizzle-orm";
import { LOAD_TEST_MARKER } from "./load-test-marker.js";

// The site the frontend is actually pointed at during this test run (matches
// the X-Site-ID the browser sends, read from localStorage — check by hitting
// GET /api/sites and seeing which one the running frontend's logo/name match).
// Override via env if testing a different tenant.
const TARGET_SITE_SLUG = process.env.LOAD_TEST_SITE_SLUG || "bazar-karobar";

const THUMBS = [
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200",
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200",
  "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200",
  "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=1200",
  "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("Seeding load-test content...\n");

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@news.com")).limit(1);
  if (!admin) throw new Error("admin@news.com not found — run `npm run db:seed` first");

  const [site] = await db.select().from(sites).where(eq(sites.slug, TARGET_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`Site "${TARGET_SITE_SLUG}" not found — check GET /api/sites and set LOAD_TEST_SITE_SLUG`);
  console.log(`Seeding for site: ${site.name} (id ${site.id})\n`);

  // Categories visible to this site: owned by it, or global (siteId null).
  // Matches categoryMatchesSite() in src/utils/helpers.ts.
  const cats = await db.select().from(categories)
    .where(or(eq(categories.siteId, site.id), isNull(categories.siteId)));
  if (cats.length === 0) throw new Error("No categories found for this site — run `npm run db:seed` first");

  // ─── 60 articles spread across every category ──────────────────────────
  let created = 0;
  for (let i = 0; i < 60; i++) {
    const cat = pick(cats, i);
    const isVideo = i % 7 === 0;
    const isFeatured = i % 9 === 0;
    const isTrending = i % 5 === 0;
    const isBreaking = i % 13 === 0;
    const slug = `${LOAD_TEST_MARKER}${cat.slug}-article-${i}`;

    await db.insert(articles).values({
      siteId: site.id,
      isGlobal: true,
      title: `Load Test Article ${i} — ${cat.name}`,
      titleHindi: `लोड टेस्ट समाचार ${i} — ${cat.nameHindi ?? cat.name}`,
      slug,
      summary: `This is a seeded load-test summary for article ${i} in ${cat.name}, used to verify the home page renders correctly under realistic content volume.`,
      content: `<p>यह एक लोड-टेस्ट समाचार है, जिसे होम पेज के लेआउट और प्रदर्शन का परीक्षण करने के लिए बनाया गया है। लेख संख्या ${i}, श्रेणी: ${cat.name}.</p>`,
      authorId: admin.id,
      categoryId: cat.id,
      thumbnailUrl: pick(THUMBS, i),
      contentType: isVideo ? "video" : "article",
      videoUrl: isVideo ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : undefined,
      videoType: isVideo ? "youtube" : "none",
      isBreaking,
      isTrending,
      isFeatured,
      status: "published",
      publishedAt: new Date(Date.now() - i * 3600_000),
      viewsCount: Math.floor(Math.random() * 5000),
      readTimeMinutes: 2 + (i % 6),
    }).onConflictDoNothing({ target: articles.slug });
    created++;
  }
  console.log(`✓ Articles seeded: ${created}`);

  // ─── 8 photo galleries ──────────────────────────────────────────────────
  let galleryCount = 0;
  for (let i = 0; i < 8; i++) {
    const cat = pick(cats, i);
    const slug = `${LOAD_TEST_MARKER}gallery-${i}`;
    const [gallery] = await db.insert(photoGalleries).values({
      siteId: site.id,
      title: `Load Test Gallery ${i}`,
      titleHindi: `लोड टेस्ट गैलरी ${i}`,
      slug,
      description: "Seeded gallery for load testing.",
      thumbnailUrl: pick(THUMBS, i),
      categoryId: cat.id,
      authorId: admin.id,
      status: "published",
      publishedAt: new Date(),
    }).onConflictDoNothing({ target: photoGalleries.slug }).returning({ id: photoGalleries.id });

    if (gallery) {
      await db.insert(galleryImages).values(
        Array.from({ length: 4 }).map((_, j) => ({
          galleryId: gallery.id,
          imageUrl: pick(THUMBS, i + j),
          caption: `Slide ${j + 1}`,
          sortOrder: j,
        }))
      );
      galleryCount++;
    }
  }
  console.log(`✓ Photo galleries seeded: ${galleryCount}`);

  // ─── 8 web stories ──────────────────────────────────────────────────────
  let storyCount = 0;
  for (let i = 0; i < 8; i++) {
    const cat = pick(cats, i);
    const slug = `${LOAD_TEST_MARKER}webstory-${i}`;
    await db.insert(webStories).values({
      siteId: site.id,
      title: `Load Test Web Story ${i}`,
      titleHindi: `लोड टेस्ट वेब स्टोरी ${i}`,
      slug,
      thumbnailUrl: pick(THUMBS, i),
      categoryId: cat.id,
      authorId: admin.id,
      slides: Array.from({ length: 3 }).map((_, j) => ({
        id: `${i}-${j}`,
        imageUrl: pick(THUMBS, i + j),
        headline: `Slide ${j + 1} headline`,
        description: "Seeded slide for load testing.",
      })),
      status: "published",
      publishedAt: new Date(),
    } as any).onConflictDoNothing({ target: webStories.slug });
    storyCount++;
  }
  console.log(`✓ Web stories seeded: ${storyCount}`);

  // ─── One ad per zone ────────────────────────────────────────────────────
  const zones = [
    "header-leaderboard", "breaking-below", "sidebar-top", "sidebar-middle",
    "in-article-1", "in-article-2", "footer-banner", "category-top",
    "video-preroll", "popup",
  ] as const;

  let adCount = 0;
  for (const zone of zones) {
    const name = `${LOAD_TEST_MARKER}ad-${zone}`;
    const existing = await db.select({ id: ads.id }).from(ads).where(eq(ads.name, name)).limit(1);
    if (existing.length) continue;
    await db.insert(ads).values({
      siteId: site.id,
      name,
      zone,
      type: "image",
      imageUrl: "https://placehold.co/970x90/F36D21/FFFFFF?text=Ad+" + zone,
      linkUrl: "https://example.com",
      altText: `Test ad for ${zone}`,
      width: zone === "sidebar-top" || zone === "sidebar-middle" || zone === "in-article-1" || zone === "in-article-2" ? 300 : 970,
      height: zone === "sidebar-top" || zone === "sidebar-middle" || zone === "in-article-1" || zone === "in-article-2" ? 250 : 90,
      deviceTarget: "all",
      status: "active",
      priority: 1,
      advertiserName: "Load Test Advertiser",
      createdBy: admin.id,
    });
    adCount++;
  }
  console.log(`✓ Ads seeded: ${adCount} (of ${zones.length} zones)`);

  console.log("\nDone. Run `npm run cleanup:load-test` to remove all seeded rows.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
