import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env.js";
import { checkDbConnection } from "./config/db.js";
import { optionalAuth } from "./middleware/auth.js";
import { siteResolver } from "./middleware/siteResolver.js";

// Routes
import authRoutes from "./routes/auth.js";
import sitesRoutes from "./routes/sites.js";
import articlesRoutes from "./routes/articles.js";
import categoriesRoutes from "./routes/categories.js";
import locationsRoutes from "./routes/locations.js";
import mediaRoutes from "./routes/media.js";
import adsRoutes from "./routes/ads.js";
import reportersRoutes from "./routes/reporters.js";
import featuresRoutes from "./routes/features.js";
import membershipRoutes from "./routes/membership.js";
import adminRoutes from "./routes/admin.js";
import seoRoutes from "./routes/seo.js";
import feedRoutes from "./routes/feed.js";
import classifiedsRoutes from "./routes/classifieds.js";
import shokSandeshRoutes from "./routes/shokSandesh.js";
import epaperRoutes from "./routes/epaper.js";

const app = express();

// Trust the reverse proxy (Nginx/Render/Railway/etc.) so req.ip reflects the
// real client and rate limiting doesn't bucket all traffic together.
if (!ENV.isDev) {
  const trustProxy = /^\d+$/.test(ENV.trustProxy) ? parseInt(ENV.trustProxy, 10) : ENV.trustProxy;
  app.set("trust proxy", trustProxy);
}

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: ENV.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(ENV.cookieSecret));
app.use(morgan(ENV.isDev ? "dev" : "combined"));

// Rate limiting (disabled in development)
if (!ENV.isDev) {
  const limiter = rateLimit({
    windowMs: ENV.rateLimitWindowMs,
    max: ENV.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
    // Public reads (articles, categories, epaper, feed, etc.) are the bulk of
    // a news site's traffic and are frequently shared behind carrier/office
    // NAT IPs — only rate-limit writes/mutations here, not GET/HEAD reads.
    // Ad impression/click tracking is also fired by every reader's page (not
    // just admins/editors), so it's excluded from this limiter too.
    skip: (req) =>
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.path === "/ads/impression" ||
      req.path === "/ads/click",
  });
  app.use("/api/", limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many login attempts, please try again later" },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/reporters/login", authLimiter);
  app.use("/api/ads/advertiser/login", authLimiter);
}

// Site resolver — attaches site context from hostname/header
app.use(siteResolver);

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/articles", articlesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/locations", locationsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/reporters", reportersRoutes);
app.use("/api/features", featuresRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/classifieds", classifiedsRoutes);
app.use("/api/shok-sandesh", shokSandeshRoutes);
app.use("/api/epaper", epaperRoutes);

// ─── SEO & Feed Routes (non-API, served at root) ───────────────────────────
app.get("/sitemap.xml", (req, res, next) => { req.url = "/sitemap.xml"; seoRoutes(req, res, next); });
app.get("/robots.txt", (req, res, next) => { req.url = "/robots.txt"; seoRoutes(req, res, next); });
app.use("/feed", feedRoutes);

// ─── CSRF Token ─────────────────────────────────────────────────────────────

import { csrfTokenEndpoint } from "./middleware/csrf.js";
app.get("/api/csrf-token", csrfTokenEndpoint);

// ─── API Docs ──────────────────────────────────────────────────────────────
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./config/swagger.js";
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "News Platform API Docs",
}));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: ENV.nodeEnv,
    uptime: Math.floor(process.uptime()),
  });
});

app.get("/api/health/deep", async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    const { db } = await import("./config/db.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch { checks.database = "error"; }

  try {
    const { getRedis } = await import("./config/redis.js");
    const r = getRedis();
    if (r) { await r.ping(); checks.redis = "ok"; }
    else checks.redis = "unavailable";
  } catch { checks.redis = "error"; }

  try {
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ endpoint: ENV.s3Endpoint, region: ENV.s3Region, credentials: { accessKeyId: ENV.s3AccessKey, secretAccessKey: ENV.s3SecretKey }, forcePathStyle: true });
    await s3.send(new HeadBucketCommand({ Bucket: ENV.s3Bucket }));
    checks.storage = "ok";
  } catch { checks.storage = "error"; }

  const allOk = Object.values(checks).every((v) => v === "ok" || v === "unavailable");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err);
  res.status(err.status || 500).json({
    error: ENV.isDev ? err.message : "Internal server error",
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────

import { startScheduler } from "./utils/scheduler.js";
import { setupFullTextSearch } from "./utils/search.js";
import { setupWebPush } from "./utils/pushNotification.js";

async function start() {
  const dbOk = await checkDbConnection();
  if (!dbOk) {
    console.warn("[Server] Starting without database connection — some features will be unavailable");
  }

  app.listen(ENV.port, () => {
    console.log(`
┌─────────────────────────────────────────────┐
│  News Platform API Server                   │
│  Port: ${ENV.port}                              │
│  Env:  ${ENV.nodeEnv.padEnd(20)}          │
│  CORS: ${ENV.corsOrigins[0]?.slice(0, 28)?.padEnd(28)}     │
│  DB:   ${dbOk ? "Connected ✓" : "Disconnected ✗".padEnd(20)}            │
└─────────────────────────────────────────────┘
    `);

    if (dbOk) {
      startScheduler();
      setupFullTextSearch();
      setupWebPush();
    }
  });
}

start();
