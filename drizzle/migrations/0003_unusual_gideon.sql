CREATE TYPE "public"."epaper_processing_status" AS ENUM('idle', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "epaper_page_regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_id" integer NOT NULL,
	"article_id" integer,
	"external_url" text,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"width" double precision NOT NULL,
	"height" double precision NOT NULL,
	"label" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_epaper_site_date";--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD COLUMN "edition" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD COLUMN "pdf_source_key" text;--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD COLUMN "source_type" varchar(20) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD COLUMN "processing_status" "epaper_processing_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD COLUMN "processing_error" text;--> statement-breakpoint
ALTER TABLE "epaper_page_regions" ADD CONSTRAINT "epaper_page_regions_page_id_epaper_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."epaper_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epaper_page_regions" ADD CONSTRAINT "epaper_page_regions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_epaper_regions_page" ON "epaper_page_regions" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_epaper_site_date_edition" ON "epaper_issues" USING btree ("site_id","issue_date","edition");--> statement-breakpoint
CREATE INDEX "idx_epaper_processing_status" ON "epaper_issues" USING btree ("processing_status");