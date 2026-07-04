ALTER TABLE "ads" ADD COLUMN "impression_cap" integer;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "click_cap" integer;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "impression_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ads" ADD COLUMN "click_count" integer DEFAULT 0 NOT NULL;