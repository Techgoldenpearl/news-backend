CREATE UNIQUE INDEX "idx_ads_site_zone_name" ON "ads" USING btree ("site_id","zone","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_site_slug" ON "categories" USING btree ("site_id","slug");--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_domain_unique" UNIQUE("domain");