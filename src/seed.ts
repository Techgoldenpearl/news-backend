import "dotenv/config";
import { db } from "./config/db.js";
import {
  users, sites, categories, membershipPlans,
  tags, states, cities, utilityData, revenueConfig,
} from "../drizzle/schema.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── Super Admin ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(users)
    .values({
      name: "Super Admin",
      email: "admin@news.com",
      passwordHash,
      role: "super_admin",
      isVerified: true,
    })
    .onConflictDoNothing()
    .returning();
  console.log("✓ Super Admin created:", admin?.email ?? "already exists");

  // ─── Default Site ───────────────────────────────────────────────────────────
  const [site] = await db
    .insert(sites)
    .values({
      name: "The Local Leader",
      slug: "the-local-leader",
      domain: "localhost",
      language: "hi",
      region: "India",
      description: "Hindi News Portal",
      theme: {
        primaryColor: "#E53E3E",
        secondaryColor: "#FF8C00",
        headerBg: "#1a1a2e",
        fontFamily: "Noto Sans Devanagari",
        navStyle: "mega-menu",
      },
    })
    .onConflictDoNothing()
    .returning();
  console.log("✓ Default site created:", site?.name ?? "already exists");

  // ─── Categories ─────────────────────────────────────────────────────────────
  const categoryList = [
    { name: "Politics", nameHindi: "राजनीति", slug: "politics", color: "#E53E3E", sortOrder: 1 },
    { name: "National", nameHindi: "राष्ट्रीय", slug: "national", color: "#DD6B20", sortOrder: 2 },
    { name: "International", nameHindi: "अंतर्राष्ट्रीय", slug: "international", color: "#3182CE", sortOrder: 3 },
    { name: "Sports", nameHindi: "खेल", slug: "sports", color: "#38A169", sortOrder: 4 },
    { name: "Entertainment", nameHindi: "मनोरंजन", slug: "entertainment", color: "#805AD5", sortOrder: 5 },
    { name: "Business", nameHindi: "व्यापार", slug: "business", color: "#D69E2E", sortOrder: 6 },
    { name: "Technology", nameHindi: "तकनीक", slug: "technology", color: "#00B5D8", sortOrder: 7 },
    { name: "Education", nameHindi: "शिक्षा", slug: "education", color: "#319795", sortOrder: 8 },
    { name: "Health", nameHindi: "स्वास्थ्य", slug: "health", color: "#E53E3E", sortOrder: 9 },
    { name: "Crime", nameHindi: "अपराध", slug: "crime", color: "#718096", sortOrder: 10 },
    { name: "Lifestyle", nameHindi: "जीवनशैली", slug: "lifestyle", color: "#ED64A6", sortOrder: 11 },
    { name: "Agriculture", nameHindi: "कृषि", slug: "agriculture", color: "#48BB78", sortOrder: 12 },
  ];

  for (const cat of categoryList) {
    await db.insert(categories).values({ ...cat, siteId: site?.id }).onConflictDoNothing();
  }
  console.log("✓ Categories seeded:", categoryList.length);

  // ─── Tags ───────────────────────────────────────────────────────────────────
  const tagList = [
    { name: "Breaking News", slug: "breaking-news" },
    { name: "Elections", slug: "elections" },
    { name: "Cricket", slug: "cricket" },
    { name: "Bollywood", slug: "bollywood" },
    { name: "Budget", slug: "budget" },
    { name: "Weather", slug: "weather" },
    { name: "COVID-19", slug: "covid-19" },
    { name: "IPL", slug: "ipl" },
  ];

  for (const tag of tagList) {
    await db.insert(tags).values(tag).onConflictDoNothing();
  }
  console.log("✓ Tags seeded:", tagList.length);

  // ─── States ─────────────────────────────────────────────────────────────────
  const stateList = [
    { name: "Uttar Pradesh", nameHindi: "उत्तर प्रदेश", slug: "uttar-pradesh", code: "UP", sortOrder: 1 },
    { name: "Madhya Pradesh", nameHindi: "मध्य प्रदेश", slug: "madhya-pradesh", code: "MP", sortOrder: 2 },
    { name: "Maharashtra", nameHindi: "महाराष्ट्र", slug: "maharashtra", code: "MH", sortOrder: 3 },
    { name: "Rajasthan", nameHindi: "राजस्थान", slug: "rajasthan", code: "RJ", sortOrder: 4 },
    { name: "Bihar", nameHindi: "बिहार", slug: "bihar", code: "BR", sortOrder: 5 },
    { name: "Delhi", nameHindi: "दिल्ली", slug: "delhi", code: "DL", sortOrder: 6 },
  ];

  for (const s of stateList) {
    await db.insert(states).values(s).onConflictDoNothing();
  }
  console.log("✓ States seeded:", stateList.length);

  // ─── Membership Plans ───────────────────────────────────────────────────────
  const plans = [
    {
      name: "Basic", nameHindi: "बेसिक", slug: "basic",
      description: "Ad-free reading experience",
      price: "99.00", currency: "INR", interval: "monthly" as const,
      durationDays: 30, adFree: true, downloadEnabled: false, prioritySupport: false,
      features: ["Ad-free experience", "All articles access"],
      sortOrder: 1, isPopular: false,
    },
    {
      name: "Premium", nameHindi: "प्रीमियम", slug: "premium",
      description: "Full access with premium features",
      price: "249.00", currency: "INR", interval: "monthly" as const,
      durationDays: 30, adFree: true, downloadEnabled: true, prioritySupport: true,
      features: ["Ad-free experience", "Premium articles", "Download articles", "Priority support"],
      sortOrder: 2, isPopular: true,
    },
    {
      name: "Annual Premium", nameHindi: "वार्षिक प्रीमियम", slug: "annual-premium",
      description: "Best value — save 40%",
      price: "1799.00", currency: "INR", interval: "yearly" as const,
      durationDays: 365, adFree: true, downloadEnabled: true, prioritySupport: true,
      features: ["Ad-free experience", "Premium articles", "Download articles", "Priority support", "40% savings"],
      sortOrder: 3, isPopular: false,
    },
  ];

  for (const plan of plans) {
    await db.insert(membershipPlans).values(plan).onConflictDoNothing();
  }
  console.log("✓ Membership plans seeded:", plans.length);

  // ─── Utility Data (mock) ───────────────────────────────────────────────────
  const utilities = [
    { dataType: "petrol" as const, city: "Delhi", value: "94.72", change: "+0.12", changePercent: "+0.13%", unit: "₹/litre" },
    { dataType: "diesel" as const, city: "Delhi", value: "87.62", change: "+0.08", changePercent: "+0.09%", unit: "₹/litre" },
    { dataType: "gold" as const, city: "National", value: "73,450", change: "+120", changePercent: "+0.16%", unit: "₹/10g" },
    { dataType: "silver" as const, city: "National", value: "92,800", change: "-200", changePercent: "-0.22%", unit: "₹/kg" },
    { dataType: "sensex" as const, city: "National", value: "82,345.67", change: "+234.50", changePercent: "+0.29%", unit: "points" },
    { dataType: "nifty" as const, city: "National", value: "25,012.30", change: "+78.20", changePercent: "+0.31%", unit: "points" },
  ];

  for (const u of utilities) {
    await db.insert(utilityData).values(u).onConflictDoNothing();
  }
  console.log("✓ Utility data seeded:", utilities.length);

  // ─── Revenue Config ─────────────────────────────────────────────────────────
  const zones = [
    "header-leaderboard", "breaking-below", "sidebar-top", "sidebar-middle",
    "in-article-1", "in-article-2", "footer-banner", "category-top",
  ];
  for (const zone of zones) {
    await db.insert(revenueConfig).values({ zone, cpmRate: "0.5000", cpcRate: "2.0000" }).onConflictDoNothing();
  }
  console.log("✓ Revenue config seeded:", zones.length, "zones");

  console.log("\n✅ Seed completed successfully!");
  console.log("   Admin login: admin@news.com / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
