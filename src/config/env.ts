import "dotenv/config";

export const ENV = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",
  cookieSecret: process.env.COOKIE_SECRET || "change-me-in-production",

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001").split(","),

  s3Endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3Bucket: process.env.S3_BUCKET || "news-media",
  s3AccessKey: process.env.S3_ACCESS_KEY || "minioadmin",
  s3SecretKey: process.env.S3_SECRET_KEY || "minioadmin123",
  s3PublicUrl: process.env.S3_PUBLIC_URL || "http://localhost:9000/news-media",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@news.com",

  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
  vapidEmail: process.env.VAPID_EMAIL || "",

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10),

  // Number of reverse-proxy hops in front of the app (Nginx, Render, Railway, etc.)
  // Needed so express-rate-limit keys by real client IP instead of the proxy's IP.
  trustProxy: process.env.TRUST_PROXY ?? "1",

  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",

  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
} as const;
