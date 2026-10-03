import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sqlClient } from './client.js';
import path from 'node:path';

async function runMigrations() {
  console.log('⏳ Running PostgreSQL migrations for MiniHub Car...');
  try {
    // Ensure pgcrypto extension is created
    await sqlClient`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
    console.log('✅ pgcrypto extension verified.');

    const migrationsFolder = path.resolve(process.cwd(), './drizzle');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations();
