CREATE TYPE "public"."ad_request_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'paused');--> statement-breakpoint
CREATE TYPE "public"."ad_status" AS ENUM('active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."ad_type" AS ENUM('image', 'html', 'script', 'text');--> statement-breakpoint
CREATE TYPE "public"."ad_zone" AS ENUM('header-leaderboard', 'breaking-below', 'sidebar-top', 'sidebar-middle', 'in-article-1', 'in-article-2', 'footer-banner', 'category-top', 'video-preroll', 'popup');--> statement-breakpoint
CREATE TYPE "public"."advertiser_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'scheduled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('article', 'video', 'explainer', 'webstory', 'epaper');--> statement-breakpoint
CREATE TYPE "public"."device_target" AS ENUM('all', 'desktop', 'mobile');--> statement-breakpoint
CREATE TYPE "public"."gallery_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."login_method" AS ENUM('email', 'google', 'phone');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'video', 'pdf', 'thumbnail');--> statement-breakpoint
CREATE TYPE "public"."membership_interval" AS ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'lifetime');--> statement-breakpoint
CREATE TYPE "public"."rashi" AS ENUM('mesh', 'vrishabh', 'mithun', 'kark', 'singh', 'kanya', 'tula', 'vrishchik', 'dhanu', 'makar', 'kumbh', 'meen');--> statement-breakpoint
CREATE TYPE "public"."rashifal_period" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('helpful', 'not_helpful', 'love', 'angry', 'sad');--> statement-breakpoint
CREATE TYPE "public"."reporter_notif_type" AS ENUM('submission_approved', 'submission_rejected', 'revision_requested', 'account_approved', 'account_suspended', 'general');--> statement-breakpoint
CREATE TYPE "public"."reporter_status" AS ENUM('pending', 'active', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('hero', 'featured', 'breaking_ticker', 'category_feed', 'video_feed', 'web_stories', 'photo_gallery', 'rashifal', 'trending', 'latest', 'custom_html', 'ad_banner');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'pending', 'under_review', 'approved', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled', 'paused');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'editor', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."utility_data_type" AS ENUM('petrol', 'diesel', 'gold', 'silver', 'sensex', 'nifty', 'currency', 'weather');--> statement-breakpoint
CREATE TYPE "public"."video_type" AS ENUM('youtube', 'direct', 'none');--> statement-breakpoint
CREATE TYPE "public"."web_story_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "ad_clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"session_id" varchar(64),
	"ip" varchar(64),
	"referer" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_impressions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"session_id" varchar(64),
	"user_agent" text,
	"ip" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"name" varchar(200) NOT NULL,
	"zone" "ad_zone" NOT NULL,
	"type" "ad_type" DEFAULT 'image' NOT NULL,
	"image_url" text,
	"link_url" text,
	"alt_text" varchar(300),
	"html_content" text,
	"width" integer,
	"height" integer,
	"device_target" "device_target" DEFAULT 'all' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "ad_status" DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"advertiser_name" varchar(200),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertiser_ad_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"advertiser_id" integer NOT NULL,
	"site_id" integer,
	"name" varchar(200) NOT NULL,
	"zone" varchar(100) NOT NULL,
	"type" "ad_request_status" DEFAULT 'pending' NOT NULL,
	"content" text,
	"image_url" varchar(500),
	"image_key" varchar(300),
	"link_url" varchar(500),
	"alt_text" varchar(200),
	"width" integer,
	"height" integer,
	"device_target" "device_target" DEFAULT 'all' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" numeric(10, 2),
	"cpm_rate" numeric(8, 4),
	"cpc_rate" numeric(8, 4),
	"status" "ad_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"linked_ad_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertisers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"contact_name" varchar(150) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(20),
	"gst_number" varchar(20),
	"address" text,
	"website" varchar(300),
	"status" "advertiser_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "advertisers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "article_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer,
	"url" text NOT NULL,
	"file_key" text NOT NULL,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"file_size" integer,
	"media_type" "media_type" DEFAULT 'image' NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"reaction" "reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"topic_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"title" text NOT NULL,
	"title_hindi" text,
	"slug" varchar(300) NOT NULL,
	"summary" text,
	"content" text NOT NULL,
	"author_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"thumbnail_url" text,
	"video_url" text,
	"video_type" "video_type" DEFAULT 'none',
	"content_type" "content_type" DEFAULT 'article' NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"is_sponsored" boolean DEFAULT false NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"location" varchar(200),
	"state" varchar(100),
	"city" varchar(100),
	"views_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"read_time_minutes" integer DEFAULT 3,
	"meta_title" text,
	"meta_description" text,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_role" varchar(30),
	"user_name" varchar(200),
	"user_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(50),
	"entity_title" varchar(500),
	"details" text,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_hindi" varchar(200),
	"slug" varchar(200) NOT NULL,
	"bio" text,
	"bio_hindi" text,
	"photo_url" text,
	"designation" varchar(200),
	"email" varchar(320),
	"twitter_handle" varchar(100),
	"facebook_url" text,
	"articles_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"name" varchar(100) NOT NULL,
	"name_hindi" varchar(100),
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon_url" text,
	"color" varchar(20) DEFAULT '#E53E3E',
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"show_in_nav" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"state_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_hindi" varchar(100),
	"slug" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"status" "comment_status" DEFAULT 'pending' NOT NULL,
	"parent_id" integer,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"gallery_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"caption_hindi" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_blog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"live_blog_id" integer NOT NULL,
	"content" text NOT NULL,
	"content_hindi" text,
	"image_url" text,
	"is_highlight" boolean DEFAULT false NOT NULL,
	"author_id" integer,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_blogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"is_live" boolean DEFAULT true NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_blogs_article_id_unique" UNIQUE("article_id")
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_hindi" varchar(200),
	"slug" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"interval" "membership_interval" NOT NULL,
	"duration_days" integer NOT NULL,
	"features" json,
	"max_articles_per_day" integer,
	"ad_free" boolean DEFAULT false NOT NULL,
	"download_enabled" boolean DEFAULT false NOT NULL,
	"priority_support" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membership_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"breaking_news" boolean DEFAULT true NOT NULL,
	"sports" boolean DEFAULT false NOT NULL,
	"entertainment" boolean DEFAULT false NOT NULL,
	"politics" boolean DEFAULT false NOT NULL,
	"business" boolean DEFAULT false NOT NULL,
	"technology" boolean DEFAULT false NOT NULL,
	"rashifal" boolean DEFAULT false NOT NULL,
	"local_news" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "page_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"sections" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"payment_provider" varchar(50) NOT NULL,
	"payment_id" varchar(200),
	"order_id" varchar(200),
	"status" varchar(30) NOT NULL,
	"receipt_url" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_galleries" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"title" varchar(300) NOT NULL,
	"title_hindi" varchar(300),
	"slug" varchar(300) NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"category_id" integer,
	"author_id" integer,
	"article_id" integer,
	"status" "gallery_status" DEFAULT 'draft' NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photo_galleries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"endpoint" text NOT NULL,
	"p256dh_key" text,
	"auth_key" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rashifal" (
	"id" serial PRIMARY KEY NOT NULL,
	"rashi" "rashi" NOT NULL,
	"period" "rashifal_period" DEFAULT 'daily' NOT NULL,
	"date" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"content_hindi" text,
	"lucky_number" varchar(20),
	"lucky_color" varchar(50),
	"lucky_direction" varchar(50),
	"score" integer DEFAULT 5,
	"love_score" integer DEFAULT 5,
	"career_score" integer DEFAULT 5,
	"health_score" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"read_duration_seconds" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "reporter_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"type" "reporter_notif_type" NOT NULL,
	"title" varchar(300) NOT NULL,
	"message" text NOT NULL,
	"submission_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporter_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_id" integer NOT NULL,
	"site_id" integer,
	"title" text NOT NULL,
	"title_hindi" text,
	"summary" text,
	"content" text NOT NULL,
	"category_id" integer,
	"thumbnail_url" text,
	"thumbnail_key" text,
	"images" json,
	"tags" json,
	"location" varchar(200),
	"state" varchar(100),
	"city" varchar(100),
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"admin_note" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"published_article_id" integer,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporters" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"employee_id" varchar(20) NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_hindi" varchar(200),
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"phone" varchar(20),
	"photo_url" text,
	"photo_key" text,
	"designation" varchar(200) DEFAULT 'पत्रकार',
	"beat" varchar(200),
	"city" varchar(100),
	"state" varchar(100),
	"bio" text,
	"twitter_handle" varchar(100),
	"facebook_url" text,
	"status" "reporter_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"approved_by" integer,
	"approved_at" timestamp,
	"id_card_expiry" timestamp,
	"submissions_count" integer DEFAULT 0 NOT NULL,
	"approved_count" integer DEFAULT 0 NOT NULL,
	"total_views_count" integer DEFAULT 0 NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reporters_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "reporters_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "revenue_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone" varchar(100) NOT NULL,
	"cpm_rate" numeric(8, 4) DEFAULT '0.5000' NOT NULL,
	"cpc_rate" numeric(8, 4) DEFAULT '2.0000' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_config_zone_unique" UNIQUE("zone")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(300),
	"subdomain" varchar(100),
	"logo_url" text,
	"favicon_url" text,
	"description" text,
	"language" varchar(10) DEFAULT 'hi' NOT NULL,
	"region" varchar(100),
	"theme" json,
	"social_links" json,
	"seo_defaults" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_hindi" varchar(100),
	"slug" varchar(100) NOT NULL,
	"code" varchar(10),
	"thumbnail_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "states_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"name_hindi" varchar(200),
	"slug" varchar(200) NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"articles_count" integer DEFAULT 0 NOT NULL,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"payment_id" varchar(200),
	"payment_provider" varchar(50),
	"payment_amount" numeric(10, 2),
	"payment_currency" varchar(10) DEFAULT 'INR',
	"auto_renew" boolean DEFAULT true NOT NULL,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200),
	"email" varchar(320),
	"phone" varchar(20),
	"password_hash" text,
	"login_method" "login_method" DEFAULT 'email',
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"avatar_url" text,
	"bio" text,
	"preferences" json,
	"is_verified" boolean DEFAULT false NOT NULL,
	"age_confirmed_at" timestamp,
	"consent_at" timestamp,
	"deleted_at" timestamp,
	"last_signed_in" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "utility_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_type" "utility_data_type" NOT NULL,
	"city" varchar(100),
	"value" varchar(100) NOT NULL,
	"change" varchar(50),
	"change_percent" varchar(20),
	"unit" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"title" varchar(300) NOT NULL,
	"title_hindi" varchar(300),
	"slug" varchar(300) NOT NULL,
	"thumbnail_url" text,
	"category_id" integer,
	"author_id" integer,
	"slides" json NOT NULL,
	"status" "web_story_status" DEFAULT 'draft' NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "web_stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "ad_clicks" ADD CONSTRAINT "ad_clicks_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_impressions" ADD CONSTRAINT "ad_impressions_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ads" ADD CONSTRAINT "ads_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_ad_requests" ADD CONSTRAINT "advertiser_ad_requests_advertiser_id_advertisers_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."advertisers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_ad_requests" ADD CONSTRAINT "advertiser_ad_requests_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_media" ADD CONSTRAINT "article_media_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_topics" ADD CONSTRAINT "article_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_gallery_id_photo_galleries_id_fk" FOREIGN KEY ("gallery_id") REFERENCES "public"."photo_galleries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_blog_entries" ADD CONSTRAINT "live_blog_entries_live_blog_id_live_blogs_id_fk" FOREIGN KEY ("live_blog_id") REFERENCES "public"."live_blogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_blogs" ADD CONSTRAINT "live_blogs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_galleries" ADD CONSTRAINT "photo_galleries_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_galleries" ADD CONSTRAINT "photo_galleries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporter_notifications" ADD CONSTRAINT "reporter_notifications_reporter_id_reporters_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."reporters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporter_submissions" ADD CONSTRAINT "reporter_submissions_reporter_id_reporters_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."reporters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporter_submissions" ADD CONSTRAINT "reporter_submissions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporter_submissions" ADD CONSTRAINT "reporter_submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporters" ADD CONSTRAINT "reporters_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_stories" ADD CONSTRAINT "web_stories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_stories" ADD CONSTRAINT "web_stories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clicks_ad" ON "ad_clicks" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "idx_clicks_created" ON "ad_clicks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_impressions_ad" ON "ad_impressions" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "idx_impressions_created" ON "ad_impressions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ads_zone" ON "ads" USING btree ("zone");--> statement-breakpoint
CREATE INDEX "idx_ads_status" ON "ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ads_zone_status" ON "ads" USING btree ("zone","status");--> statement-breakpoint
CREATE INDEX "idx_adrequests_advertiser" ON "advertiser_ad_requests" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "idx_adrequests_status" ON "advertiser_ad_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_advertisers_email" ON "advertisers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_advertisers_status" ON "advertisers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reactions_user_article" ON "article_reactions" USING btree ("user_id","article_id");--> statement-breakpoint
CREATE INDEX "idx_articles_status" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_articles_category" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_articles_published" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_articles_breaking" ON "articles" USING btree ("is_breaking");--> statement-breakpoint
CREATE INDEX "idx_articles_trending" ON "articles" USING btree ("is_trending");--> statement-breakpoint
CREATE INDEX "idx_articles_site" ON "articles" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bookmarks_user_article" ON "bookmarks" USING btree ("user_id","article_id");--> statement-breakpoint
CREATE INDEX "idx_comments_article" ON "comments" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_comments_status" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_live_blog_entries_blog" ON "live_blog_entries" USING btree ("live_blog_id");--> statement-breakpoint
CREATE INDEX "idx_payment_user" ON "payment_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_rashifal_rashi_date" ON "rashifal" USING btree ("rashi","date");--> statement-breakpoint
CREATE INDEX "idx_rashifal_period" ON "rashifal" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_reading_history_user" ON "reading_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reading_history_article" ON "reading_history" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "idx_reporter_notifs_reporter" ON "reporter_notifications" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_reporter_notifs_read" ON "reporter_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_submissions_reporter" ON "reporter_submissions" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_status" ON "reporter_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_submissions_submitted" ON "reporter_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_reporters_status" ON "reporters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reporters_email" ON "reporters" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "user_subscriptions" USING btree ("status");