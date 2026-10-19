import { sqlClient } from './client.js';

async function migrateAnalytics() {
  console.log('🔄 Iniciando migração para métricas de acessos e atividade de usuários...');

  try {
    // 1. Adicionar last_login_at em app_user
    await sqlClient`
      ALTER TABLE app_user 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
    `;
    await sqlClient`
      CREATE INDEX IF NOT EXISTS ix_app_user_last_login ON app_user(last_login_at);
    `;
    console.log('✅ Campo last_login_at e índice criados em app_user.');

    // 2. Criar tabela site_visit
    await sqlClient`
      CREATE TABLE IF NOT EXISTS site_visit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        path VARCHAR(500) NOT NULL,
        visitor_id VARCHAR(100) NOT NULL,
        user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
        ip_hash VARCHAR(64),
        user_agent TEXT,
        referer VARCHAR(500),
        device_type VARCHAR(20) NOT NULL DEFAULT 'DESKTOP',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✅ Tabela site_visit criada ou verificada.');

    // 3. Índices de site_visit
    await sqlClient`CREATE INDEX IF NOT EXISTS ix_site_visit_created_at ON site_visit(created_at);`;
    await sqlClient`CREATE INDEX IF NOT EXISTS ix_site_visit_path ON site_visit(path);`;
    await sqlClient`CREATE INDEX IF NOT EXISTS ix_site_visit_visitor ON site_visit(visitor_id);`;
    await sqlClient`CREATE INDEX IF NOT EXISTS ix_site_visit_user ON site_visit(user_id);`;
    console.log('✅ Índices de site_visit verificados.');

    console.log('🎉 Migração de métricas e analytics concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração de analytics:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

migrateAnalytics();
