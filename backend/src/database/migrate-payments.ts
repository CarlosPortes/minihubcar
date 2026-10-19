import { sql } from 'drizzle-orm';
import { db } from './client';

export async function migratePayments() {
  console.log('[MIGRATE] Criando tabela pix_charge para PIX Automático e Webhook...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pix_charge (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
      reference_type VARCHAR(40) NOT NULL,
      reference_id VARCHAR(120),
      txid VARCHAR(60) NOT NULL UNIQUE,
      amount NUMERIC(12, 2) NOT NULL,
      pix_copia_e_cola TEXT NOT NULL,
      qr_code_data_url TEXT,
      status VARCHAR(25) NOT NULL DEFAULT 'PENDING',
      description VARCHAR(255),
      metadata TEXT,
      paid_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS ix_pix_charge_user ON pix_charge(user_id);
    CREATE INDEX IF NOT EXISTS ix_pix_charge_txid ON pix_charge(txid);
    CREATE INDEX IF NOT EXISTS ix_pix_charge_status ON pix_charge(status);
    CREATE INDEX IF NOT EXISTS ix_pix_charge_reference ON pix_charge(reference_type, reference_id);
  `);

  console.log('[MIGRATE] Tabela pix_charge pronta com sucesso.');
}

if (process.argv[1] && (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('migrate-payments'))) {
  migratePayments()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATE] Erro ao migrar payments:', err);
      process.exit(1);
    });
}
