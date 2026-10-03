ALTER TABLE "variation" ADD COLUMN "series_number" varchar(50);--> statement-breakpoint
ALTER TABLE "variation" ADD COLUMN "collector_number" varchar(50);--> statement-breakpoint
ALTER TABLE "variation" ADD COLUMN "line_type" varchar(50);--> statement-breakpoint
ALTER TABLE "variation" ADD COLUMN "rarity" varchar(50);--> statement-breakpoint
CREATE INDEX "ix_variation_rarity" ON "variation" USING btree ("rarity");