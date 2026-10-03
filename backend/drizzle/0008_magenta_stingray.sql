CREATE TABLE "pre_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_number" varchar(50) NOT NULL,
	"buyer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'RESERVED' NOT NULL,
	"payment_plan" varchar(50) NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"remaining_amount" numeric(14, 2) NOT NULL,
	"estimated_arrival" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pre_order_pre_order_number_unique" UNIQUE("pre_order_number")
);
--> statement-breakpoint
CREATE TABLE "pre_order_installment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"total_installments" integer NOT NULL,
	"description" varchar(150) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"due_date" date,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"paid_amount" numeric(14, 2),
	"payment_method" varchar(50),
	"settled_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "is_pre_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "pre_order_estimated_arrival" varchar(100);--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "allow_deposit_and_balance" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "deposit_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "allow_full_on_arrival" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "allow_installments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "max_installments" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pre_order" ADD CONSTRAINT "pre_order_buyer_id_app_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order" ADD CONSTRAINT "pre_order_seller_id_seller_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order" ADD CONSTRAINT "pre_order_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order" ADD CONSTRAINT "pre_order_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_installment" ADD CONSTRAINT "pre_order_installment_pre_order_id_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."pre_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_order_installment" ADD CONSTRAINT "pre_order_installment_settled_by_app_user_id_fk" FOREIGN KEY ("settled_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pre_order_number" ON "pre_order" USING btree ("pre_order_number");--> statement-breakpoint
CREATE INDEX "ix_pre_order_buyer" ON "pre_order" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "ix_pre_order_seller" ON "pre_order" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "ix_pre_order_offer" ON "pre_order" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "ix_pre_order_status" ON "pre_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_pre_order_installment_order" ON "pre_order_installment" USING btree ("pre_order_id");--> statement-breakpoint
CREATE INDEX "ix_pre_order_installment_status" ON "pre_order_installment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_pre_order_installment_due_date" ON "pre_order_installment" USING btree ("due_date");