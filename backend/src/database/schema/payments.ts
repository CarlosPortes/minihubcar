import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

export const pixCharge = pgTable('pix_charge', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id),
  referenceType: varchar('reference_type', { length: 40 }).notNull(), // 'SUBSCRIPTION', 'PRE_ORDER_INSTALLMENT', 'DONATION', 'ORDER'
  referenceId: varchar('reference_id', { length: 120 }),
  txid: varchar('txid', { length: 60 }).notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  pixCopiaECola: text('pix_copia_e_cola').notNull(),
  qrCodeDataUrl: text('qr_code_data_url'),
  status: varchar('status', { length: 25 }).default('PENDING').notNull(), // 'PENDING', 'PAID', 'EXPIRED', 'CANCELLED'
  description: varchar('description', { length: 255 }),
  metadata: text('metadata'), // JSON string
  paidAt: timestamp('paid_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_pix_charge_user').on(table.userId),
  index('ix_pix_charge_txid').on(table.txid),
  index('ix_pix_charge_status').on(table.status),
  index('ix_pix_charge_reference').on(table.referenceType, table.referenceId),
]);

export type PixCharge = typeof pixCharge.$inferSelect;
export type NewPixCharge = typeof pixCharge.$inferInsert;
