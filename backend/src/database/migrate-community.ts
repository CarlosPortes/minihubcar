import { sqlClient } from './client.js';

async function migrateCommunity() {
  try {
    console.log('⏳ Criando tabela user_collection_photo...');
    await sqlClient`
      CREATE TABLE IF NOT EXISTS user_collection_photo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
        photo_url VARCHAR(1000) NOT NULL,
        caption VARCHAR(200),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        reviewed_by UUID REFERENCES app_user(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        sort_order INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_col_photo_user ON user_collection_photo(user_id);`;
    await sqlClient`CREATE INDEX IF NOT EXISTS ix_user_col_photo_status ON user_collection_photo(status);`;

    console.log('✅ Tabela user_collection_photo e índices verificados com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao criar tabela:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

migrateCommunity();
