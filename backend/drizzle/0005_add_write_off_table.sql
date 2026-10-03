CREATE TABLE IF NOT EXISTS "write_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exemplar_id" uuid NOT NULL,
	"reason" varchar(50) NOT NULL,
	"write_off_date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "write_off" ADD CONSTRAINT "write_off_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "write_off" ADD CONSTRAINT "write_off_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_write_off_user" ON "write_off" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_write_off_exemplar" ON "write_off" USING btree ("exemplar_id");
