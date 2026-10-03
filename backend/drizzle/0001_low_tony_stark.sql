ALTER TABLE "exemplar_location" ADD COLUMN "grid_row" integer;--> statement-breakpoint
ALTER TABLE "exemplar_location" ADD COLUMN "grid_column" integer;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "has_grid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "grid_rows" integer;--> statement-breakpoint
ALTER TABLE "location" ADD COLUMN "grid_columns" integer;--> statement-breakpoint
ALTER TABLE "location_movement" ADD COLUMN "from_grid_row" integer;--> statement-breakpoint
ALTER TABLE "location_movement" ADD COLUMN "from_grid_column" integer;--> statement-breakpoint
ALTER TABLE "location_movement" ADD COLUMN "to_grid_row" integer;--> statement-breakpoint
ALTER TABLE "location_movement" ADD COLUMN "to_grid_column" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_location_slot_current" ON "exemplar_location" USING btree ("location_id","grid_row","grid_column") WHERE is_current = true AND grid_row IS NOT NULL AND grid_column IS NOT NULL;