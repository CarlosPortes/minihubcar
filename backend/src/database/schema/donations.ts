import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

export const donation = pgTable('donation', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id, { onDelete: 'set null' }),
  donorName: varchar('donor_name', { length: 150 }).default('Colecionador Apoiador').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  pixKey: varchar('pix_key', { length: 150 }),
  message: text('message'),
  status: varchar('status', { length: 30 }).default('CONFIRMED').notNull(), // PENDING, CONFIRMED
  monthRef: varchar('month_ref', { length: 7 }).notNull(), // '2026-09'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_donation_month_ref').on(table.monthRef),
  index('ix_donation_user').on(table.userId),
]);
