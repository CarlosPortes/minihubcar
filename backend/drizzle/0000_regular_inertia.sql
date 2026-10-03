CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(320) NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"password_hash" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_role_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "automaker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"normalized_name" varchar(150) NOT NULL,
	"country" varchar(100),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniature_brand_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"normalized_name" varchar(200) NOT NULL,
	"description" text,
	"fantasy_flag" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casting_franchise" (
	"casting_id" uuid NOT NULL,
	"franchise_id" uuid NOT NULL,
	"role_type" varchar(50),
	"notes" text,
	CONSTRAINT "casting_franchise_casting_id_franchise_id_pk" PRIMARY KEY("casting_id","franchise_id")
);
--> statement-breakpoint
CREATE TABLE "casting_vehicle" (
	"casting_id" uuid NOT NULL,
	"vehicle_model_id" uuid NOT NULL,
	"vehicle_generation_id" uuid,
	"relationship_type" varchar(30) DEFAULT 'EXACT' NOT NULL,
	"notes" text,
	CONSTRAINT "casting_vehicle_casting_id_vehicle_model_id_pk" PRIMARY KEY("casting_id","vehicle_model_id")
);
--> statement-breakpoint
CREATE TABLE "entertainment_franchise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"normalized_name" varchar(200) NOT NULL,
	"type" varchar(50),
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identifier_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniature_brand_id" uuid,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "miniature_brand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"normalized_name" varchar(150) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_identifier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variation_id" uuid NOT NULL,
	"identifier_type_id" uuid NOT NULL,
	"code" varchar(150) NOT NULL,
	"normalized_code" varchar(150) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"numerator" integer DEFAULT 1 NOT NULL,
	"denominator" integer NOT NULL,
	"normalized_value" numeric(12, 6),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"miniature_brand_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"normalized_name" varchar(150) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"casting_id" uuid NOT NULL,
	"series_id" uuid,
	"scale_id" uuid,
	"name" varchar(200) NOT NULL,
	"release_year" smallint,
	"color" varchar(100),
	"finish" varchar(100),
	"packaging" varchar(100),
	"edition" varchar(100),
	"description" text,
	"photo_url" varchar(1000),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_generation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_model_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"generation_number" integer,
	"start_year" smallint,
	"end_year" smallint,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automaker_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"normalized_name" varchar(150) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_exemplar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	"condition_type_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"acquisition_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condition_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exemplar_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exemplar_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_location_id" uuid,
	"name" varchar(150) NOT NULL,
	"normalized_name" varchar(150) NOT NULL,
	"location_type" varchar(50),
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_movement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exemplar_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "acquisition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"acquisition_type" varchar(30) NOT NULL,
	"acquisition_date" date NOT NULL,
	"source_name" varchar(200),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acquisition_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acquisition_id" uuid NOT NULL,
	"exemplar_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_cost" numeric(14, 2) DEFAULT '0.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sale_date" date NOT NULL,
	"buyer_name" varchar(200),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"exemplar_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_price" numeric(14, 2) DEFAULT '0.00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"variation_id" uuid,
	"exemplar_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"variation_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exemplar_photo" (
	"exemplar_id" uuid NOT NULL,
	"photo_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exemplar_photo_exemplar_id_photo_id_pk" PRIMARY KEY("exemplar_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "photo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"url" varchar(1000),
	"mime_type" varchar(100),
	"file_size" bigint,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"proposed_data" jsonb NOT NULL,
	"reason" text,
	"status" varchar(30) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"old_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"comment" text
);
--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting" ADD CONSTRAINT "casting_miniature_brand_id_miniature_brand_id_fk" FOREIGN KEY ("miniature_brand_id") REFERENCES "public"."miniature_brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_franchise" ADD CONSTRAINT "casting_franchise_casting_id_casting_id_fk" FOREIGN KEY ("casting_id") REFERENCES "public"."casting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_franchise" ADD CONSTRAINT "casting_franchise_franchise_id_entertainment_franchise_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."entertainment_franchise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_vehicle" ADD CONSTRAINT "casting_vehicle_casting_id_casting_id_fk" FOREIGN KEY ("casting_id") REFERENCES "public"."casting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_vehicle" ADD CONSTRAINT "casting_vehicle_vehicle_model_id_vehicle_model_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casting_vehicle" ADD CONSTRAINT "casting_vehicle_vehicle_generation_id_vehicle_generation_id_fk" FOREIGN KEY ("vehicle_generation_id") REFERENCES "public"."vehicle_generation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identifier_type" ADD CONSTRAINT "identifier_type_miniature_brand_id_miniature_brand_id_fk" FOREIGN KEY ("miniature_brand_id") REFERENCES "public"."miniature_brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_identifier" ADD CONSTRAINT "product_identifier_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_identifier" ADD CONSTRAINT "product_identifier_identifier_type_id_identifier_type_id_fk" FOREIGN KEY ("identifier_type_id") REFERENCES "public"."identifier_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_miniature_brand_id_miniature_brand_id_fk" FOREIGN KEY ("miniature_brand_id") REFERENCES "public"."miniature_brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation" ADD CONSTRAINT "variation_casting_id_casting_id_fk" FOREIGN KEY ("casting_id") REFERENCES "public"."casting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation" ADD CONSTRAINT "variation_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variation" ADD CONSTRAINT "variation_scale_id_scale_id_fk" FOREIGN KEY ("scale_id") REFERENCES "public"."scale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_generation" ADD CONSTRAINT "vehicle_generation_vehicle_model_id_vehicle_model_id_fk" FOREIGN KEY ("vehicle_model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_automaker_id_automaker_id_fk" FOREIGN KEY ("automaker_id") REFERENCES "public"."automaker"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_exemplar" ADD CONSTRAINT "collection_exemplar_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_exemplar" ADD CONSTRAINT "collection_exemplar_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_exemplar" ADD CONSTRAINT "collection_exemplar_condition_type_id_condition_type_id_fk" FOREIGN KEY ("condition_type_id") REFERENCES "public"."condition_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exemplar_location" ADD CONSTRAINT "exemplar_location_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exemplar_location" ADD CONSTRAINT "exemplar_location_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exemplar_location" ADD CONSTRAINT "exemplar_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_parent_location_id_location_id_fk" FOREIGN KEY ("parent_location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_movement" ADD CONSTRAINT "location_movement_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_movement" ADD CONSTRAINT "location_movement_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_movement" ADD CONSTRAINT "location_movement_from_location_id_location_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_movement" ADD CONSTRAINT "location_movement_to_location_id_location_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition" ADD CONSTRAINT "acquisition_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_item" ADD CONSTRAINT "acquisition_item_acquisition_id_acquisition_id_fk" FOREIGN KEY ("acquisition_id") REFERENCES "public"."acquisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_item" ADD CONSTRAINT "acquisition_item_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_list" ADD CONSTRAINT "custom_list_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_list_item" ADD CONSTRAINT "custom_list_item_list_id_custom_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."custom_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_list_item" ADD CONSTRAINT "custom_list_item_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_list_item" ADD CONSTRAINT "custom_list_item_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_variation_id_variation_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."variation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exemplar_photo" ADD CONSTRAINT "exemplar_photo_exemplar_id_collection_exemplar_id_fk" FOREIGN KEY ("exemplar_id") REFERENCES "public"."collection_exemplar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exemplar_photo" ADD CONSTRAINT "exemplar_photo_photo_id_photo_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request" ADD CONSTRAINT "catalog_request_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request" ADD CONSTRAINT "catalog_request_reviewed_by_app_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request_status_history" ADD CONSTRAINT "catalog_request_status_history_request_id_catalog_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."catalog_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request_status_history" ADD CONSTRAINT "catalog_request_status_history_changed_by_app_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_app_user_email" ON "app_user" USING btree ("normalized_email");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_permission_code" ON "permission" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_role_code" ON "role" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_automaker_normalized_name" ON "automaker" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_casting_brand_name" ON "casting" USING btree ("miniature_brand_id","normalized_name");--> statement-breakpoint
CREATE INDEX "ix_casting_brand" ON "casting" USING btree ("miniature_brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_entertainment_franchise_name" ON "entertainment_franchise" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "ix_identifier_type_brand" ON "identifier_type" USING btree ("miniature_brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_miniature_brand_normalized_name" ON "miniature_brand" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_product_identifier" ON "product_identifier" USING btree ("identifier_type_id","normalized_code");--> statement-breakpoint
CREATE INDEX "ix_product_identifier_variation" ON "product_identifier" USING btree ("variation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_scale_ratio" ON "scale" USING btree ("numerator","denominator");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_series_brand_name" ON "series" USING btree ("miniature_brand_id","normalized_name");--> statement-breakpoint
CREATE INDEX "ix_series_brand" ON "series" USING btree ("miniature_brand_id");--> statement-breakpoint
CREATE INDEX "ix_variation_casting" ON "variation" USING btree ("casting_id");--> statement-breakpoint
CREATE INDEX "ix_variation_series" ON "variation" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "ix_variation_scale" ON "variation" USING btree ("scale_id");--> statement-breakpoint
CREATE INDEX "ix_variation_release_year" ON "variation" USING btree ("release_year");--> statement-breakpoint
CREATE INDEX "ix_variation_name" ON "variation" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ix_vehicle_generation_model" ON "vehicle_generation" USING btree ("vehicle_model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_vehicle_model_automaker_name" ON "vehicle_model" USING btree ("automaker_id","normalized_name");--> statement-breakpoint
CREATE INDEX "ix_vehicle_model_automaker" ON "vehicle_model" USING btree ("automaker_id");--> statement-breakpoint
CREATE INDEX "ix_collection_exemplar_user" ON "collection_exemplar" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_collection_exemplar_user_variation" ON "collection_exemplar" USING btree ("user_id","variation_id");--> statement-breakpoint
CREATE INDEX "ix_collection_exemplar_variation" ON "collection_exemplar" USING btree ("variation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_condition_type_code" ON "condition_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "ix_exemplar_location_exemplar" ON "exemplar_location" USING btree ("exemplar_id");--> statement-breakpoint
CREATE INDEX "ix_exemplar_location_user" ON "exemplar_location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_exemplar_location_location" ON "exemplar_location" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "ix_location_user" ON "location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_location_parent" ON "location" USING btree ("parent_location_id");--> statement-breakpoint
CREATE INDEX "ix_location_movement_exemplar" ON "location_movement" USING btree ("exemplar_id");--> statement-breakpoint
CREATE INDEX "ix_location_movement_user" ON "location_movement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_acquisition_user" ON "acquisition" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_acquisition_item_acquisition" ON "acquisition_item" USING btree ("acquisition_id");--> statement-breakpoint
CREATE INDEX "ix_acquisition_item_exemplar" ON "acquisition_item" USING btree ("exemplar_id");--> statement-breakpoint
CREATE INDEX "ix_sale_user" ON "sale" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_sale_item_sale" ON "sale_item" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "ix_sale_item_exemplar" ON "sale_item" USING btree ("exemplar_id");--> statement-breakpoint
CREATE INDEX "ix_custom_list_user" ON "custom_list" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_custom_list_item_list" ON "custom_list_item" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_wishlist_user_variation" ON "wishlist_item" USING btree ("user_id","variation_id");--> statement-breakpoint
CREATE INDEX "ix_wishlist_user" ON "wishlist_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_audit_log_user" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ix_catalog_request_user" ON "catalog_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_catalog_request_status" ON "catalog_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_catalog_request_history_request" ON "catalog_request_status_history" USING btree ("request_id");