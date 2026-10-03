-- Migration 0015: Add password_reset_token table
CREATE TABLE IF NOT EXISTS "password_reset_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "is_used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_password_reset_token" ON "password_reset_token" ("token");
CREATE INDEX IF NOT EXISTS "ix_password_reset_user" ON "password_reset_token" ("user_id");
