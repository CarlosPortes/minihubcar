-- Migration 0013: Add seller_shipping_integration table for BYOK (Bring Your Own Key) SuperFrete, Frete Rápido, Melhor Envio

CREATE TABLE IF NOT EXISTS seller_shipping_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profile(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  api_key TEXT NOT NULL,
  extra_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_seller_shipping_integration ON seller_shipping_integration(seller_id, provider);
CREATE INDEX IF NOT EXISTS ix_seller_shipping_integration_seller ON seller_shipping_integration(seller_id);
