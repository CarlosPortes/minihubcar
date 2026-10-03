ALTER TABLE "casting" ADD COLUMN IF NOT EXISTS "automaker_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casting" ADD CONSTRAINT "casting_automaker_id_automaker_id_fk" FOREIGN KEY ("automaker_id") REFERENCES "automaker"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_casting_automaker" ON "casting" USING btree ("automaker_id");--> statement-breakpoint

ALTER TABLE "collection_exemplar" ADD COLUMN IF NOT EXISTS "automaker_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_exemplar" ADD COLUMN IF NOT EXISTS "vehicle_model_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_exemplar" ADD CONSTRAINT "collection_exemplar_automaker_id_automaker_id_fk" FOREIGN KEY ("automaker_id") REFERENCES "automaker"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_exemplar" ADD CONSTRAINT "collection_exemplar_vehicle_model_id_vehicle_model_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_model"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_collection_exemplar_automaker" ON "collection_exemplar" USING btree ("automaker_id");
