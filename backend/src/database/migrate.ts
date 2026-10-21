import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sqlClient } from './client.js';
import { migratePayments } from './migrate-payments.js';
import { migrateCollectorProfile } from './migrate-collector-profile.js';
import { migrateTrades } from './migrate-trades.js';
import path from 'node:path';

async function runMigrations() {
  console.log('⏳ Running PostgreSQL migrations for MiniHub Car...');
  try {
    // Ensure pgcrypto extension is created
    await sqlClient`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
    console.log('✅ pgcrypto extension verified.');

    // Ensure evolution schema is created for Evolution API
    await sqlClient`CREATE SCHEMA IF NOT EXISTS evolution;`;
    console.log('✅ evolution schema verified.');

    const migrationsFolder = path.resolve(process.cwd(), './drizzle');
    try {
      await migrate(db, { migrationsFolder });
      console.log('✅ Migrations applied successfully!');
    } catch (migErr: any) {
      if (
        migErr?.code === '42P07' ||
        migErr?.code === '42710' ||
        migErr?.code === '42701' ||
        migErr?.message?.includes('already exists')
      ) {
        console.log('ℹ️ Tabelas e esquemas já existentes no banco de dados. Migração sincronizada.');
      } else {
        throw migErr;
      }
    }

    // Run modular domain migrations
    await migratePayments();
    await migrateCollectorProfile();
    await migrateTrades();

    // Ensure catalog admin roles for collector account
    await sqlClient`
      INSERT INTO user_role ("user_id", "role_id")
      SELECT u.id, r.id
      FROM app_user u
      CROSS JOIN role r
      WHERE u.normalized_email = 'colecionador@minihubcar.com.br'
        AND r.code IN ('CATALOG_ADMIN', 'SYSTEM_ADMIN')
      ON CONFLICT DO NOTHING;
    `;
    console.log('✅ Papéis de administração garantidos para colecionador@minihubcar.com.br.');

    console.log('✅ Todas as migrações modulares (PIX, Perfil Público, Trocas) concluídas!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations();
