import {
  boolean,
  decimal,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  bigserial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENUMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "editor",
  "admin",
  "super_admin",
]);

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "published",
  "scheduled",
  "archived",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "article",
  "video",
  "explainer",
  "webstory",
  "epaper",
]);

export const videoTypeEnum = pgEnum("video_type", [
  "youtube",
  "direct",
  "none",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "video",
  "pdf",
  "thumbnail",
]);

export const commentStatusEnum = pgEnum("comment_status", [
  "pending",
  "approved",
  "rejected",
]);

export const reporterStatusEnum = pgEnum("reporter_status", [
  "pending",
  "active",
  "suspended",
  "rejected",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "pending",
  "under_review",
  "approved",
  "rejected",
  "revision_requested",
]);

export const reporterNotifTypeEnum = pgEnum("reporter_notif_type", [
  "submission_approved",
  "submission_rejected",
  "revision_requested",
  "account_approved",
  "account_suspended",
  "general",
]);

export const adZoneEnum = pgEnum("ad_zone", [
  "header-leaderboard",
  "breaking-below",
  "sidebar-top",
  "sidebar-middle",
  "in-article-1",
  "in-article-2",
  "footer-banner",
  "category-top",
  "video-preroll",
  "popup",
]);

export const adTypeEnum = pgEnum("ad_type", [
  "image",
  "html",
  "script",
  "text",
]);

export const adStatusEnum = pgEnum("ad_status", [
  "active",
  "paused",
  "expired",
]);

export const deviceTargetEnum = pgEnum("device_target", [
  "all",
  "desktop",
  "mobile",
]);

export const advertiserStatusEnum = pgEnum("advertiser_status", [
  "pending",
  "active",
  "suspended",
]);

export const adRequestStatusEnum = pgEnum("ad_request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "paused",
]);

export const rashiEnum = pgEnum("rashi", [
  "mesh",
  "vrishabh",
  "mithun",
  "kark",
  "singh",
  "kanya",
  "tula",
  "vrishchik",
  "dhanu",
  "makar",
  "kumbh",
  "meen",
]);

export const rashifalPeriodEnum = pgEnum("rashifal_period", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const webStoryStatusEnum = pgEnum("web_story_status", [
  "draft",
  "published",
  "archived",
]);

export const galleryStatusEnum = pgEnum("gallery_status", [
  "draft",
  "published",
]);

export const reactionEnum = pgEnum("reaction_type", [
  "helpful",
  "not_helpful",
  "love",
  "angry",
  "sad",
]);

export const utilityDataTypeEnum = pgEnum("utility_data_type", [
  "petrol",
  "diesel",
  "gold",
  "silver",
  "sensex",
  "nifty",
  "currency",
  "weather",
]);

export const sectionTypeEnum = pgEnum("section_type", [
  "hero",
  "featured",
  "breaking_ticker",
  "category_feed",
  "video_feed",
  "web_stories",
  "photo_gallery",
  "rashifal",
  "trending",
  "latest",
  "custom_html",
  "ad_banner",
]);

export const membershipIntervalEnum = pgEnum("membership_interval", [
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
  "lifetime",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "cancelled",
  "paused",
]);

export const loginMethodEnum = pgEnum("login_method", [
  "email",
  "google",
  "phone",
]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SITES (multi-site support — 8+ landing pages from one backend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 300 }),
  subdomain: varchar("subdomain", { length: 100 }),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  description: text("description"),
  language: varchar("language", { length: 10 }).default("hi").notNull(),
  region: varchar("region", { length: 100 }),
  theme: json("theme").$type<{
    primaryColor: string;
    secondaryColor: string;
    headerBg: string;
    fontFamily: string;
    navStyle: string;
  }>(),
  socialLinks: json("social_links").$type<{
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
  }>(),
  seoDefaults: json("seo_defaults").$type<{
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USERS (customers / admin / editors)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }),
  email: varchar("email", { length: 320 }).unique(),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash"),
  loginMethod: loginMethodEnum("login_method").default("email"),
  role: userRoleEnum("role").default("user").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  preferences: json("preferences").$type<{
    categories: string[];
    locations: string[];
  }>(),
  isVerified: boolean("is_verified").default(false).notNull(),
  ageConfirmedAt: timestamp("age_confirmed_at"),
  consentAt: timestamp("consent_at"),
  deletedAt: timestamp("deleted_at"),
  lastSignedIn: timestamp("last_signed_in").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SafeUser = Omit<User, "passwordHash">;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBERSHIP PLANS & SUBSCRIPTIONS (customer premium access)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 200 }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  interval: membershipIntervalEnum("interval").notNull(),
  durationDays: integer("duration_days").notNull(),
  features: json("features").$type<string[]>(),
  maxArticlesPerDay: integer("max_articles_per_day"),
  adFree: boolean("ad_free").default(false).notNull(),
  downloadEnabled: boolean("download_enabled").default(false).notNull(),
  prioritySupport: boolean("priority_support").default(false).notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  isPopular: boolean("is_popular").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MembershipPlan = typeof membershipPlans.$inferSelect;

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => membershipPlans.id),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    paymentId: varchar("payment_id", { length: 200 }),
    paymentProvider: varchar("payment_provider", { length: 50 }),
    paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
    paymentCurrency: varchar("payment_currency", { length: 10 }).default("INR"),
    autoRenew: boolean("auto_renew").default(true).notNull(),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_subscriptions_user").on(table.userId),
    index("idx_subscriptions_status").on(table.status),
  ]
);

export type UserSubscription = typeof userSubscriptions.$inferSelect;

export const paymentHistory = pgTable(
  "payment_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: integer("subscription_id").references(
      () => userSubscriptions.id
    ),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("INR").notNull(),
    paymentProvider: varchar("payment_provider", { length: 50 }).notNull(),
    paymentId: varchar("payment_id", { length: 200 }),
    orderId: varchar("order_id", { length: 200 }),
    status: varchar("status", { length: 30 }).notNull(),
    receiptUrl: text("receipt_url"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_payment_user").on(table.userId)]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 100 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  color: varchar("color", { length: 20 }).default("#E53E3E"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  showInNav: boolean("show_in_nav").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARTICLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    titleHindi: text("title_hindi"),
    slug: varchar("slug", { length: 300 }).notNull().unique(),
    summary: text("summary"),
    content: text("content").notNull(),
    authorId: integer("author_id").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    thumbnailUrl: text("thumbnail_url"),
    videoUrl: text("video_url"),
    videoType: videoTypeEnum("video_type").default("none"),
    contentType: contentTypeEnum("content_type").default("article").notNull(),
    isBreaking: boolean("is_breaking").default(false).notNull(),
    isTrending: boolean("is_trending").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isPremium: boolean("is_premium").default(false).notNull(),
    isSponsored: boolean("is_sponsored").default(false).notNull(),
    isGlobal: boolean("is_global").default(false).notNull(),
    status: articleStatusEnum("status").default("draft").notNull(),
    location: varchar("location", { length: 200 }),
    state: varchar("state", { length: 100 }),
    city: varchar("city", { length: 100 }),
    viewsCount: integer("views_count").default(0).notNull(),
    commentsCount: integer("comments_count").default(0).notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    readTimeMinutes: integer("read_time_minutes").default(3),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_articles_status").on(table.status),
    index("idx_articles_category").on(table.categoryId),
    index("idx_articles_published").on(table.publishedAt),
    index("idx_articles_breaking").on(table.isBreaking),
    index("idx_articles_trending").on(table.isTrending),
    index("idx_articles_site").on(table.siteId),
  ]
);

export type Article = typeof articles.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARTICLE TAGS (Junction)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const articleTags = pgTable("article_tags", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARTICLE MEDIA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const articleMedia = pgTable("article_media", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id, {
    onDelete: "cascade",
  }),
  url: text("url").notNull(),
  fileKey: text("file_key").notNull(),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  mediaType: mediaTypeEnum("media_type").default("image").notNull(),
  uploadedBy: integer("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ArticleMedia = typeof articleMedia.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BOOKMARKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_bookmarks_user_article").on(table.userId, table.articleId),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: commentStatusEnum("status").default("pending").notNull(),
    parentId: integer("parent_id"),
    likesCount: integer("likes_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_article").on(table.articleId),
    index("idx_comments_status").on(table.status),
  ]
);

export type Comment = typeof comments.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUSH NOTIFICATION SUBSCRIPTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key"),
  authKey: text("auth_key"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE LAYOUTS (dynamic homepage builder per site)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const pageLayouts = pgTable("page_layouts", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  pageType: varchar("page_type", { length: 50 }).notNull(),
  sections: json("sections")
    .$type<
      Array<{
        id: string;
        type: string;
        title?: string;
        titleHindi?: string;
        categorySlug?: string;
        limit?: number;
        config?: Record<string, unknown>;
        sortOrder: number;
      }>
    >()
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTHORS (Journalist Profiles)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 200 }),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  bio: text("bio"),
  bioHindi: text("bio_hindi"),
  photoUrl: text("photo_url"),
  designation: varchar("designation", { length: 200 }),
  email: varchar("email", { length: 320 }),
  twitterHandle: varchar("twitter_handle", { length: 100 }),
  facebookUrl: text("facebook_url"),
  articlesCount: integer("articles_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Author = typeof authors.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPICS (followable tags)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 200 }),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  articlesCount: integer("articles_count").default(0).notNull(),
  followersCount: integer("followers_count").default(0).notNull(),
  isTrending: boolean("is_trending").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const articleTopics = pgTable("article_topics", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
});

export const topicFollows = pgTable("topic_follows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATES & CITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const states = pgTable("states", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 10 }),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  stateId: integer("state_id")
    .notNull()
    .references(() => states.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 100 }),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RASHIFAL (Horoscope)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const rashifal = pgTable(
  "rashifal",
  {
    id: serial("id").primaryKey(),
    rashi: rashiEnum("rashi").notNull(),
    period: rashifalPeriodEnum("period").default("daily").notNull(),
    date: varchar("date", { length: 20 }).notNull(),
    content: text("content").notNull(),
    contentHindi: text("content_hindi"),
    luckyNumber: varchar("lucky_number", { length: 20 }),
    luckyColor: varchar("lucky_color", { length: 50 }),
    luckyDirection: varchar("lucky_direction", { length: 50 }),
    score: integer("score").default(5),
    loveScore: integer("love_score").default(5),
    careerScore: integer("career_score").default(5),
    healthScore: integer("health_score").default(5),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_rashifal_rashi_date").on(table.rashi, table.date),
    index("idx_rashifal_period").on(table.period),
  ]
);

export type Rashifal = typeof rashifal.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEB STORIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const webStories = pgTable("web_stories", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 300 }).notNull(),
  titleHindi: varchar("title_hindi", { length: 300 }),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  thumbnailUrl: text("thumbnail_url"),
  categoryId: integer("category_id").references(() => categories.id),
  authorId: integer("author_id"),
  slides: json("slides")
    .$type<
      Array<{
        id: string;
        imageUrl: string;
        headline: string;
        description?: string;
        bgColor?: string;
        textColor?: string;
      }>
    >()
    .notNull(),
  status: webStoryStatusEnum("status").default("draft").notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WebStory = typeof webStories.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PHOTO GALLERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const photoGalleries = pgTable("photo_galleries", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => sites.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 300 }).notNull(),
  titleHindi: varchar("title_hindi", { length: 300 }),
  slug: varchar("slug", { length: 300 }).notNull().unique(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  categoryId: integer("category_id").references(() => categories.id),
  authorId: integer("author_id"),
  articleId: integer("article_id"),
  status: galleryStatusEnum("status").default("draft").notNull(),
  viewsCount: integer("views_count").default(0).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id")
    .notNull()
    .references(() => photoGalleries.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  captionHindi: text("caption_hindi"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE BLOGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const liveBlogs = pgTable("live_blogs", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" })
    .unique(),
  isLive: boolean("is_live").default(true).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liveBlogEntries = pgTable(
  "live_blog_entries",
  {
    id: serial("id").primaryKey(),
    liveBlogId: integer("live_blog_id")
      .notNull()
      .references(() => liveBlogs.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    contentHindi: text("content_hindi"),
    imageUrl: text("image_url"),
    isHighlight: boolean("is_highlight").default(false).notNull(),
    authorId: integer("author_id"),
    postedAt: timestamp("posted_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_live_blog_entries_blog").on(table.liveBlogId)]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARTICLE REACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const articleReactions = pgTable(
  "article_reactions",
  {
    id: serial("id").primaryKey(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: reactionEnum("reaction").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_reactions_user_article").on(
      table.userId,
      table.articleId
    ),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// READING HISTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const readingHistory = pgTable(
  "reading_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").defaultNow().notNull(),
    readDurationSeconds: integer("read_duration_seconds").default(0),
  },
  (table) => [
    index("idx_reading_history_user").on(table.userId),
    index("idx_reading_history_article").on(table.articleId),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY DATA (Petrol/Gold/Stock prices)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const utilityData = pgTable("utility_data", {
  id: serial("id").primaryKey(),
  dataType: utilityDataTypeEnum("data_type").notNull(),
  city: varchar("city", { length: 100 }),
  value: varchar("value", { length: 100 }).notNull(),
  change: varchar("change", { length: 50 }),
  changePercent: varchar("change_percent", { length: 20 }),
  unit: varchar("unit", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTIFICATION PREFERENCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  breakingNews: boolean("breaking_news").default(true).notNull(),
  sports: boolean("sports").default(false).notNull(),
  entertainment: boolean("entertainment").default(false).notNull(),
  politics: boolean("politics").default(false).notNull(),
  business: boolean("business").default(false).notNull(),
  technology: boolean("technology").default(false).notNull(),
  rashifal: boolean("rashifal").default(false).notNull(),
  localNews: boolean("local_news").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTERS (Patrakar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const reporters = pgTable(
  "reporters",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    employeeId: varchar("employee_id", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    nameHindi: varchar("name_hindi", { length: 200 }),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    phone: varchar("phone", { length: 20 }),
    photoUrl: text("photo_url"),
    photoKey: text("photo_key"),
    designation: varchar("designation", { length: 200 }).default("पत्रकार"),
    beat: varchar("beat", { length: 200 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    bio: text("bio"),
    twitterHandle: varchar("twitter_handle", { length: 100 }),
    facebookUrl: text("facebook_url"),
    status: reporterStatusEnum("status").default("pending").notNull(),
    adminNote: text("admin_note"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    idCardExpiry: timestamp("id_card_expiry"),
    submissionsCount: integer("submissions_count").default(0).notNull(),
    approvedCount: integer("approved_count").default(0).notNull(),
    totalViewsCount: integer("total_views_count").default(0).notNull(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_reporters_status").on(table.status),
    index("idx_reporters_email").on(table.email),
  ]
);

export type Reporter = typeof reporters.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTER SUBMISSIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const reporterSubmissions = pgTable(
  "reporter_submissions",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => reporters.id, { onDelete: "cascade" }),
    siteId: integer("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    titleHindi: text("title_hindi"),
    summary: text("summary"),
    content: text("content").notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    thumbnailUrl: text("thumbnail_url"),
    thumbnailKey: text("thumbnail_key"),
    images: json("images").$type<
      Array<{ url: string; key: string; caption?: string }>
    >(),
    tags: json("tags").$type<string[]>(),
    location: varchar("location", { length: 200 }),
    state: varchar("state", { length: 100 }),
    city: varchar("city", { length: 100 }),
    status: submissionStatusEnum("status").default("draft").notNull(),
    adminNote: text("admin_note"),
    reviewedBy: integer("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    publishedArticleId: integer("published_article_id"),
    isUrgent: boolean("is_urgent").default(false).notNull(),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_submissions_reporter").on(table.reporterId),
    index("idx_submissions_status").on(table.status),
    index("idx_submissions_submitted").on(table.submittedAt),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTER NOTIFICATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const reporterNotifications = pgTable(
  "reporter_notifications",
  {
    id: serial("id").primaryKey(),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => reporters.id, { onDelete: "cascade" }),
    type: reporterNotifTypeEnum("type").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    message: text("message").notNull(),
    submissionId: integer("submission_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_reporter_notifs_reporter").on(table.reporterId),
    index("idx_reporter_notifs_read").on(table.isRead),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADVERTISEMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ads = pgTable(
  "ads",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    zone: adZoneEnum("zone").notNull(),
    type: adTypeEnum("type").notNull().default("image"),
    imageUrl: text("image_url"),
    linkUrl: text("link_url"),
    altText: varchar("alt_text", { length: 300 }),
    htmlContent: text("html_content"),
    width: integer("width"),
    height: integer("height"),
    deviceTarget: deviceTargetEnum("device_target").default("all").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    status: adStatusEnum("status").default("active").notNull(),
    priority: integer("priority").default(0).notNull(),
    advertiserName: varchar("advertiser_name", { length: 200 }),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ads_zone").on(table.zone),
    index("idx_ads_status").on(table.status),
    index("idx_ads_zone_status").on(table.zone, table.status),
  ]
);

export type Ad = typeof ads.$inferSelect;

export const adImpressions = pgTable(
  "ad_impressions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => ads.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_impressions_ad").on(table.adId),
    index("idx_impressions_created").on(table.createdAt),
  ]
);

export const adClicks = pgTable(
  "ad_clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => ads.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }),
    ip: varchar("ip", { length: 64 }),
    referer: text("referer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_clicks_ad").on(table.adId),
    index("idx_clicks_created").on(table.createdAt),
  ]
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADVERTISER PORTAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const advertisers = pgTable(
  "advertisers",
  {
    id: serial("id").primaryKey(),
    companyName: varchar("company_name", { length: 200 }).notNull(),
    contactName: varchar("contact_name", { length: 150 }).notNull(),
    email: varchar("email", { length: 200 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    gstNumber: varchar("gst_number", { length: 20 }),
    address: text("address"),
    website: varchar("website", { length: 300 }),
    status: advertiserStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_advertisers_email").on(table.email),
    index("idx_advertisers_status").on(table.status),
  ]
);

export type Advertiser = typeof advertisers.$inferSelect;

export const advertiserAdRequests = pgTable(
  "advertiser_ad_requests",
  {
    id: serial("id").primaryKey(),
    advertiserId: integer("advertiser_id")
      .notNull()
      .references(() => advertisers.id, { onDelete: "cascade" }),
    siteId: integer("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    zone: varchar("zone", { length: 100 }).notNull(),
    type: adRequestStatusEnum("type").default("pending").notNull(),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 500 }),
    imageKey: varchar("image_key", { length: 300 }),
    linkUrl: varchar("link_url", { length: 500 }),
    altText: varchar("alt_text", { length: 200 }),
    width: integer("width"),
    height: integer("height"),
    deviceTarget: deviceTargetEnum("device_target").default("all").notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    budget: decimal("budget", { precision: 10, scale: 2 }),
    cpmRate: decimal("cpm_rate", { precision: 8, scale: 4 }),
    cpcRate: decimal("cpc_rate", { precision: 8, scale: 4 }),
    status: adRequestStatusEnum("status").default("pending").notNull(),
    adminNote: text("admin_note"),
    linkedAdId: integer("linked_ad_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_adrequests_advertiser").on(table.advertiserId),
    index("idx_adrequests_status").on(table.status),
  ]
);

export const revenueConfig = pgTable("revenue_config", {
  id: serial("id").primaryKey(),
  zone: varchar("zone", { length: 100 }).notNull().unique(),
  cpmRate: decimal("cpm_rate", { precision: 8, scale: 4 })
    .default("0.5000")
    .notNull(),
  cpcRate: decimal("cpc_rate", { precision: 8, scale: 4 })
    .default("2.0000")
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIT LOGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    userRole: varchar("user_role", { length: 30 }),
    userName: varchar("user_name", { length: 200 }),
    userEmail: varchar("user_email", { length: 255 }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: varchar("entity_id", { length: 50 }),
    entityTitle: varchar("entity_title", { length: 500 }),
    details: text("details"),
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_action").on(table.action),
    index("idx_audit_created").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLASSIFIED ADS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const classifiedCategoryEnum = pgEnum("classified_category", [
  "property", "jobs", "business", "services", "vehicles",
  "buy_sell", "matrimonial", "education", "lost_found", "public_notice",
]);

export const classifiedStatusEnum = pgEnum("classified_status", [
  "pending", "approved", "rejected", "expired", "paused",
]);

export const classifiedPackageEnum = pgEnum("classified_package", [
  "basic", "standard", "premium", "urgent", "homepage_boost",
]);

export const classifiedAds = pgTable("classified_ads", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id"),
  userId: integer("user_id"),
  category: classifiedCategoryEnum("category").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  titleHindi: varchar("title_hindi", { length: 300 }),
  description: text("description"),
  descriptionHindi: text("description_hindi"),
  images: json("images").$type<string[]>().default([]),
  price: varchar("price", { length: 50 }),
  contactName: varchar("contact_name", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactWhatsapp: varchar("contact_whatsapp", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  city: varchar("city", { length: 100 }),
  area: varchar("area", { length: 200 }),
  state: varchar("state", { length: 100 }),
  packageType: classifiedPackageEnum("package_type").default("basic"),
  status: classifiedStatusEnum("status").default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  isFeatured: boolean("is_featured").default(false),
  isUrgent: boolean("is_urgent").default(false),
  isHomepage: boolean("is_homepage").default(false),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  paymentId: varchar("payment_id", { length: 100 }),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  viewsCount: integer("views_count").default(0),
  reportCount: integer("report_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_classified_status").on(table.status),
  index("idx_classified_category").on(table.category),
  index("idx_classified_city").on(table.city),
  index("idx_classified_expires").on(table.expiresAt),
]);

export const classifiedPackages = pgTable("classified_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 100 }),
  category: varchar("category", { length: 50 }),
  packageType: classifiedPackageEnum("package_type").notNull(),
  durationDays: integer("duration_days").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxImages: integer("max_images").default(1),
  features: json("features").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classifiedReports = pgTable("classified_reports", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull(),
  reporterName: varchar("reporter_name", { length: 200 }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHOK SANDESH / श्रद्धांजलि
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const shokSandeshTypeEnum = pgEnum("shok_sandesh_type", [
  "shok_sandesh", "shradhanjali", "punyatithi", "uthavna", "terahvi", "smriti_sandesh",
]);

export const shokSandeshStatusEnum = pgEnum("shok_sandesh_status", [
  "pending", "approved", "rejected", "expired",
]);

export const shokSandeshPackageEnum = pgEnum("shok_sandesh_package", [
  "basic_text", "photo_tribute", "premium_card", "homepage_featured", "newspaper_digital_combo",
]);

export const shokSandesh = pgTable("shok_sandesh", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id"),
  userId: integer("user_id"),
  type: shokSandeshTypeEnum("type").notNull(),
  deceasedName: varchar("deceased_name", { length: 300 }).notNull(),
  deceasedNameHindi: varchar("deceased_name_hindi", { length: 300 }),
  deceasedPhoto: text("deceased_photo"),
  deceasedAge: integer("deceased_age"),
  dateOfDeath: timestamp("date_of_death"),
  place: varchar("place", { length: 200 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  familyName: varchar("family_name", { length: 300 }),
  familyNameHindi: varchar("family_name_hindi", { length: 300 }),
  message: text("message"),
  messageHindi: text("message_hindi"),
  eventDetails: text("event_details"),
  eventDetailsHindi: text("event_details_hindi"),
  eventDate: timestamp("event_date"),
  eventPlace: varchar("event_place", { length: 300 }),
  templateId: varchar("template_id", { length: 50 }),
  packageType: shokSandeshPackageEnum("package_type").default("basic_text"),
  status: shokSandeshStatusEnum("status").default("pending").notNull(),
  rejectionReason: text("rejection_reason"),
  isHomepage: boolean("is_homepage").default(false),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  paymentId: varchar("payment_id", { length: 100 }),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  pdfUrl: text("pdf_url"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  viewsCount: integer("views_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_shok_status").on(table.status),
  index("idx_shok_type").on(table.type),
  index("idx_shok_city").on(table.city),
  index("idx_shok_expires").on(table.expiresAt),
]);

export const shokSandeshPackages = pgTable("shok_sandesh_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameHindi: varchar("name_hindi", { length: 100 }),
  packageType: shokSandeshPackageEnum("package_type").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  features: json("features").$type<string[]>().default([]),
  includePhoto: boolean("include_photo").default(false),
  includePdf: boolean("include_pdf").default(false),
  includeHomepage: boolean("include_homepage").default(false),
  durationDays: integer("duration_days").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
