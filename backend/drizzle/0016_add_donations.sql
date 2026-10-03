CREATE TABLE IF NOT EXISTS "donation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"donor_name" varchar(150) DEFAULT 'Colecionador Apoiador' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"pix_key" varchar(150),
	"message" text,
	"status" varchar(30) DEFAULT 'CONFIRMED' NOT NULL,
	"month_ref" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "donation" ADD CONSTRAINT "donation_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_donation_month_ref" ON "donation" USING btree ("month_ref");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_donation_user" ON "donation" USING btree ("user_id");
