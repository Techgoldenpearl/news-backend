CREATE TYPE "public"."epaper_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "epaper_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"issue_date" timestamp NOT NULL,
	"cover_image_url" text,
	"pdf_url" text,
	"status" "epaper_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epaper_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "epaper_issues" ADD CONSTRAINT "epaper_issues_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epaper_pages" ADD CONSTRAINT "epaper_pages_issue_id_epaper_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."epaper_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_epaper_site_date" ON "epaper_issues" USING btree ("site_id","issue_date");--> statement-breakpoint
CREATE INDEX "idx_epaper_status" ON "epaper_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_epaper_pages_issue" ON "epaper_pages" USING btree ("issue_id");