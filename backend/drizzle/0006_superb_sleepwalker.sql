CREATE TABLE "cart" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "cart_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"committed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_inventory_offer_id_unique" UNIQUE("offer_id")
);
--> statement-breakpoint
CREATE TABLE "commercial_product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variation_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_product_variation_id_unique" UNIQUE("variation_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"idempotency_key" varchar(150),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" varchar(250) NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"condition" varchar(50) DEFAULT 'LACRADO' NOT NULL,
	"packaging_state" varchar(100),
	"description" text,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"old_price" numeric(14, 2) NOT NULL,
	"new_price" numeric(14, 2) NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"total_items" integer DEFAULT 1 NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"freight_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"shipping_address_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"variation_snapshot" jsonb NOT NULL,
	"seller_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_authorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"store_name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"bio" text,
	"city" varchar(100),
	"state" varchar(50),
	"reputation_score" numeric(3, 2) DEFAULT '5.00' NOT NULL,
	"total_sales_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_profile_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "seller_profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stock_reservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cart_item_id" uuid,
	"order_item_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_inventory" ADD CONSTRAINT "commercial_inventory_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_product" ADD CONSTRAINT "commercial_product_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_inventory_id_commercial_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."commercial_inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_commercial_product_id_commercial_product_id_fk" FOREIGN KEY ("commercial_product_id") REFERENCES "public"."commercial_product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_seller_id_seller_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_history" ADD CONSTRAINT "offer_price_history_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_price_history" ADD CONSTRAINT "offer_price_history_changed_by_app_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_seller_id_seller_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_authorization" ADD CONSTRAINT "seller_authorization_seller_id_seller_profile_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_authorization" ADD CONSTRAINT "seller_authorization_reviewed_by_app_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_offer_id_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_cart_user" ON "cart" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_cart_item_cart" ON "cart_item" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "ix_cart_item_offer" ON "cart_item" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_commercial_inventory_offer" ON "commercial_inventory" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_commercial_product_variation" ON "commercial_product" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "ix_inventory_movement_inventory" ON "inventory_movement" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "ix_inventory_movement_type" ON "inventory_movement" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ix_inventory_movement_idempotency" ON "inventory_movement" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ix_offer_commercial_product" ON "offer" USING btree ("commercial_product_id");--> statement-breakpoint
CREATE INDEX "ix_offer_seller" ON "offer" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "ix_offer_status" ON "offer" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_offer_price" ON "offer" USING btree ("price");--> statement-breakpoint
CREATE INDEX "ix_offer_price_history_offer" ON "offer_price_history" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_order_number" ON "order" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "ix_order_user" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_order_status" ON "order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ix_order_item_seller" ON "order_item" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "ix_order_item_variation" ON "order_item" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "ix_seller_auth_seller" ON "seller_authorization" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "ix_seller_auth_status" ON "seller_authorization" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_seller_profile_user" ON "seller_profile" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_seller_profile_slug" ON "seller_profile" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_seller_profile_city_state" ON "seller_profile" USING btree ("city","state");--> statement-breakpoint
CREATE INDEX "ix_stock_reservation_offer" ON "stock_reservation" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "ix_stock_reservation_user" ON "stock_reservation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_stock_reservation_status_expires" ON "stock_reservation" USING btree ("status","expires_at");