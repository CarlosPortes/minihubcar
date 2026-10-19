import { sql } from 'drizzle-orm';
import { db } from './client';

export async function migrateCollectorProfile() {
  console.log('[MIGRATE] Adicionando campos username e bio para o Perfil Público do Colecionador...');

  await db.execute(sql`
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS username VARCHAR(50);
    ALTER TABLE app_user ADD COLUMN IF NOT EXISTS bio TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_username ON app_user(username);
  `);

  console.log('[MIGRATE] Campos de Perfil Público aplicados com sucesso.');
}

if (process.argv[1] && (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('migrate-collector-profile'))) {
  migrateCollectorProfile()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATE] Erro ao migrar collector profile:', err);
      process.exit(1);
    });
}
