CREATE TABLE "article_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"state_id" integer,
	"city_id" integer
);
--> statement-breakpoint
CREATE TABLE "article_websites" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"display_name" varchar(100),
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_locations" ADD CONSTRAINT "article_locations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_locations" ADD CONSTRAINT "article_locations_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_locations" ADD CONSTRAINT "article_locations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_websites" ADD CONSTRAINT "article_websites_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_websites" ADD CONSTRAINT "article_websites_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_categories" ADD CONSTRAINT "website_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_categories" ADD CONSTRAINT "website_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_article_locations_article" ON "article_locations" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_article_websites_unique" ON "article_websites" USING btree ("article_id","site_id");--> statement-breakpoint
CREATE INDEX "idx_article_websites_site" ON "article_websites" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_website_categories_unique" ON "website_categories" USING btree ("site_id","category_id");