ALTER TABLE "offer" ADD COLUMN IF NOT EXISTS "has_arrived" boolean DEFAULT false NOT NULL;
ALTER TABLE "offer" ADD COLUMN IF NOT EXISTS "arrived_at" timestamp with time zone;

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "delivery_mode" varchar(30) DEFAULT 'DELIVERY' NOT NULL;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "fulfillment_status" varchar(30) DEFAULT 'PENDING' NOT NULL;

ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "fulfillment_status" varchar(30) DEFAULT 'NA_GARAGEM' NOT NULL;

ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "has_arrived" boolean DEFAULT false NOT NULL;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "arrived_at" timestamp with time zone;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "fulfillment_status" varchar(30) DEFAULT 'NA_GARAGEM' NOT NULL;
