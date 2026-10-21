import { migrate } from 'drizzle-orm/postgres-js/migrator';
import bcrypt from 'bcryptjs';
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

    // 1. Clear dead/unreachable external image URLs (rodasocial.com) that cause browser ERR_TIMED_OUT
    await sqlClient`
      UPDATE variation
      SET photo_url = NULL
      WHERE photo_url LIKE '%rodasocial.com%';
    `;
    console.log('✅ Links de fotos externas inacessíveis limpos.');

    // 2. Ensure test collector account exists with Password123!
    const collectorEmail = 'colecionador@minihubcar.com.br';
    const collectorPasswordHash = await bcrypt.hash('Password123!', 10);
    await sqlClient`
      INSERT INTO app_user ("name", "email", "normalized_email", "password_hash", "is_collection_public", "status")
      VALUES ('Carlos Colecionador', ${collectorEmail}, ${collectorEmail}, ${collectorPasswordHash}, true, 'ACTIVE')
      ON CONFLICT ("normalized_email") DO UPDATE SET "password_hash" = ${collectorPasswordHash};
    `;

    // 3. Ensure all roles for collector account
    await sqlClient`
      INSERT INTO user_role ("user_id", "role_id")
      SELECT u.id, r.id
      FROM app_user u
      CROSS JOIN role r
      WHERE u.normalized_email = ${collectorEmail}
      ON CONFLICT DO NOTHING;
    `;
    console.log('✅ Usuário colecionador@minihubcar.com.br garantido com sucesso.');

    console.log('✅ Todas as migrações modulares (PIX, Perfil Público, Trocas) concluídas!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations();
