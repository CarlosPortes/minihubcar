import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

// Connection pool configuration
export const sqlClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, {
  schema,
  logger: env.NODE_ENV === 'development',
});

// Database health and readiness check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await sqlClient`SELECT 1 as health`;
    return result.length > 0 && result[0]?.health === 1;
  } catch (error) {
    return false;
  }
};
