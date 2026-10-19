import { sql } from 'drizzle-orm';
import { db } from './client';

export async function migrateTrades() {
  console.log('[MIGRATE] Criando estrutura para Sistema de Match de Trocas...');

  await db.execute(sql`
    ALTER TABLE collection_exemplar ADD COLUMN IF NOT EXISTS is_for_trade BOOLEAN DEFAULT FALSE NOT NULL;
    CREATE INDEX IF NOT EXISTS ix_collection_exemplar_trade ON collection_exemplar(is_for_trade);

    CREATE TABLE IF NOT EXISTS trade_proposal (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
      offered_exemplar_id UUID NOT NULL REFERENCES collection_exemplar(id) ON DELETE CASCADE,
      requested_exemplar_id UUID REFERENCES collection_exemplar(id) ON DELETE SET NULL,
      status VARCHAR(25) NOT NULL DEFAULT 'PENDING',
      message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS ix_trade_proposal_requester ON trade_proposal(requester_id);
    CREATE INDEX IF NOT EXISTS ix_trade_proposal_receiver ON trade_proposal(receiver_id);
    CREATE INDEX IF NOT EXISTS ix_trade_proposal_status ON trade_proposal(status);
  `);

  console.log('[MIGRATE] Sistema de Match de Trocas pronto com sucesso.');
}

if (process.argv[1] && (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('migrate-trades'))) {
  migrateTrades()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATE] Erro ao migrar trades:', err);
      process.exit(1);
    });
}
