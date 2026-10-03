-- Migration 0012: Add seller address fields, seller_shipping_address table, and offer package weight

-- 1. Add complete address columns to seller_profile
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS street VARCHAR(255);
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS number VARCHAR(50);
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
ALTER TABLE seller_profile ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

-- 2. Create seller_shipping_address table for multiple dispatch origins
CREATE TABLE IF NOT EXISTS seller_shipping_address (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profile(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL DEFAULT 'Endereço Principal',
  contact_name VARCHAR(150),
  postal_code VARCHAR(20) NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL,
  complement VARCHAR(100),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  phone VARCHAR(30),
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_seller_shipping_address_seller ON seller_shipping_address(seller_id);

-- 3. Add package_weight_grams and shipping_address_id to offer
ALTER TABLE offer ADD COLUMN IF NOT EXISTS package_weight_grams INTEGER;
ALTER TABLE offer ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES seller_shipping_address(id) ON DELETE SET NULL;
