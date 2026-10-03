ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "requires_approval" boolean DEFAULT false NOT NULL;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "approval_reason" text;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES "app_user"("id");
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "rejected_at" timestamp with time zone;
ALTER TABLE "pre_order" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
