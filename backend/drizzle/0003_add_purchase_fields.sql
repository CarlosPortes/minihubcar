ALTER TABLE "collection_exemplar" ADD COLUMN IF NOT EXISTS "purchase_price" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "collection_exemplar" ADD COLUMN IF NOT EXISTS "purchase_location" varchar(255);
