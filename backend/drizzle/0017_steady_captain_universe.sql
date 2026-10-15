CREATE TABLE "feedback_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) DEFAULT 'FEATURE_REQUEST' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"admin_response" text,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"upvotes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" uuid NOT NULL,
	"user2_id" uuid NOT NULL,
	"last_message_text" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_collection_photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"photo_url" varchar(1000) NOT NULL,
	"caption" varchar(200),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_collectible" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"manufacturer" varchar(150),
	"franchise" varchar(150),
	"character_or_subject" varchar(150),
	"release_year" integer,
	"edition" varchar(150),
	"scale" varchar(50),
	"condition_code" varchar(50) DEFAULT 'MINT' NOT NULL,
	"purchase_price" numeric(14, 2),
	"purchase_location" varchar(255),
	"acquisition_date" date,
	"location_id" uuid,
	"grid_row" integer,
	"grid_column" integer,
	"photo_url" varchar(1000),
	"notes" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"monthly_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"yearly_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"max_miniatures" integer NOT NULL,
	"max_other_collectibles" integer NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"badge" varchar(50) DEFAULT 'FREE' NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'MONTHLY' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'FREE',
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collector_external_pre_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"variation_id" uuid,
	"custom_miniature_name" varchar(255),
	"custom_brand" varchar(100),
	"custom_scale" varchar(50) DEFAULT '1/64',
	"custom_photo_url" varchar(1000),
	"seller_name" varchar(200) NOT NULL,
	"seller_contact" varchar(150),
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"remaining_amount" numeric(14, 2) NOT NULL,
	"order_date" date DEFAULT CURRENT_DATE NOT NULL,
	"estimated_arrival" varchar(100),
	"status" varchar(30) DEFAULT 'RESERVED' NOT NULL,
	"tracking_code" varchar(100),
	"tracking_carrier" varchar(50),
	"converted_exemplar_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_pre_order_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pre_order_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"paid_at" date DEFAULT CURRENT_DATE NOT NULL,
	"description" varchar(150) NOT NULL,
	"payment_method" varchar(50) DEFAULT 'PIX',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback_suggestion" ADD CONSTRAINT "feedback_suggestion_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_suggestion" ADD CONSTRAINT "feedback_suggestion_responded_by_app_user_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversation" ADD CONSTRAINT "direct_conversation_user1_id_app_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversation" ADD CONSTRAINT "direct_conversation_user2_id_app_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_conversation_id_direct_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_sender_id_app_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collection_photo" ADD CONSTRAINT "user_collection_photo_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_collection_photo" ADD CONSTRAINT "user_collection_photo_reviewed_by_app_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_collectible" ADD CONSTRAINT "custom_collectible_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_collectible" ADD CONSTRAINT "custom_collectible_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_external_pre_order" ADD CONSTRAINT "collector_external_pre_order_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_external_pre_order" ADD CONSTRAINT "collector_external_pre_order_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collector_external_pre_order" ADD CONSTRAINT "collector_external_pre_order_converted_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("converted_exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_pre_order_payment" ADD CONSTRAINT "external_pre_order_payment_pre_order_id_collector_external_pre_order_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."collector_external_pre_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_feedback_suggestion_user" ON "feedback_suggestion" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_feedback_suggestion_status" ON "feedback_suggestion" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_feedback_suggestion_type" ON "feedback_suggestion" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ix_direct_conv_user1" ON "direct_conversation" USING btree ("user1_id");--> statement-breakpoint
CREATE INDEX "ix_direct_conv_user2" ON "direct_conversation" USING btree ("user2_id");--> statement-breakpoint
CREATE INDEX "ix_direct_conv_last_message" ON "direct_conversation" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "ix_direct_msg_conversation" ON "direct_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ix_direct_msg_sender" ON "direct_message" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "ix_direct_msg_created_at" ON "direct_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ix_user_col_photo_user" ON "user_collection_photo" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_col_photo_status" ON "user_collection_photo" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_custom_collectible_user" ON "custom_collectible" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_custom_collectible_category" ON "custom_collectible" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ix_custom_collectible_location" ON "custom_collectible" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "ix_custom_collectible_franchise" ON "custom_collectible" USING btree ("franchise");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_subscription_plan_code" ON "subscription_plan" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_user_subscription_user" ON "user_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_subscription_plan" ON "user_subscription" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "ix_user_subscription_status" ON "user_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_ext_pre_order_user" ON "collector_external_pre_order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_ext_pre_order_status" ON "collector_external_pre_order" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_ext_pre_order_variation" ON "collector_external_pre_order" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "ix_ext_pre_order_payment_order" ON "external_pre_order_payment" USING btree ("pre_order_id");