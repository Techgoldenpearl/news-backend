CREATE TYPE "public"."classified_category" AS ENUM('property', 'jobs', 'business', 'services', 'vehicles', 'buy_sell', 'matrimonial', 'education', 'lost_found', 'public_notice');--> statement-breakpoint
CREATE TYPE "public"."classified_package" AS ENUM('basic', 'standard', 'premium', 'urgent', 'homepage_boost');--> statement-breakpoint
CREATE TYPE "public"."classified_status" AS ENUM('pending', 'approved', 'rejected', 'expired', 'paused');--> statement-breakpoint
CREATE TYPE "public"."shok_sandesh_package" AS ENUM('basic_text', 'photo_tribute', 'premium_card', 'homepage_featured', 'newspaper_digital_combo');--> statement-breakpoint
CREATE TYPE "public"."shok_sandesh_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."shok_sandesh_type" AS ENUM('shok_sandesh', 'shradhanjali', 'punyatithi', 'uthavna', 'terahvi', 'smriti_sandesh');--> statement-breakpoint
CREATE TABLE "classified_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" integer,
	"category" "classified_category" NOT NULL,
	"title" varchar(300) NOT NULL,
	"title_hindi" varchar(300),
	"description" text,
	"description_hindi" text,
	"images" json DEFAULT '[]'::json,
	"price" varchar(50),
	"contact_name" varchar(200),
	"contact_phone" varchar(20),
	"contact_whatsapp" varchar(20),
	"contact_email" varchar(255),
	"city" varchar(100),
	"area" varchar(200),
	"state" varchar(100),
	"package_type" "classified_package" DEFAULT 'basic',
	"status" "classified_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"is_featured" boolean DEFAULT false,
	"is_urgent" boolean DEFAULT false,
	"is_homepage" boolean DEFAULT false,
	"payment_status" varchar(20) DEFAULT 'pending',
	"payment_id" varchar(100),
	"payment_amount" numeric(10, 2),
	"published_at" timestamp,
	"expires_at" timestamp,
	"views_count" integer DEFAULT 0,
	"report_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classified_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_hindi" varchar(100),
	"category" varchar(50),
	"package_type" "classified_package" NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"max_images" integer DEFAULT 1,
	"features" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classified_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"reporter_name" varchar(200),
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shok_sandesh" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"user_id" integer,
	"type" "shok_sandesh_type" NOT NULL,
	"deceased_name" varchar(300) NOT NULL,
	"deceased_name_hindi" varchar(300),
	"deceased_photo" text,
	"deceased_age" integer,
	"date_of_death" timestamp,
	"place" varchar(200),
	"city" varchar(100),
	"state" varchar(100),
	"family_name" varchar(300),
	"family_name_hindi" varchar(300),
	"message" text,
	"message_hindi" text,
	"event_details" text,
	"event_details_hindi" text,
	"event_date" timestamp,
	"event_place" varchar(300),
	"template_id" varchar(50),
	"package_type" "shok_sandesh_package" DEFAULT 'basic_text',
	"status" "shok_sandesh_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"is_homepage" boolean DEFAULT false,
	"payment_status" varchar(20) DEFAULT 'pending',
	"payment_id" varchar(100),
	"payment_amount" numeric(10, 2),
	"pdf_url" text,
	"image_url" text,
	"published_at" timestamp,
	"expires_at" timestamp,
	"views_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shok_sandesh_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_hindi" varchar(100),
	"package_type" "shok_sandesh_package" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"features" json DEFAULT '[]'::json,
	"include_photo" boolean DEFAULT false,
	"include_pdf" boolean DEFAULT false,
	"include_homepage" boolean DEFAULT false,
	"duration_days" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_classified_status" ON "classified_ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_classified_category" ON "classified_ads" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_classified_city" ON "classified_ads" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_classified_expires" ON "classified_ads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_shok_status" ON "shok_sandesh" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_shok_type" ON "shok_sandesh" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_shok_city" ON "shok_sandesh" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_shok_expires" ON "shok_sandesh" USING btree ("expires_at");