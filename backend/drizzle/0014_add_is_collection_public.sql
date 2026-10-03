-- Migration 0014: Add is_collection_public column to app_user table
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS is_collection_public BOOLEAN NOT NULL DEFAULT true;
