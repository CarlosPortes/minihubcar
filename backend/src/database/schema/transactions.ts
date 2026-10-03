import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';
import { collectionExemplar } from './collection';

// acquisition
export const acquisition = pgTable('acquisition', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  acquisitionType: varchar('acquisition_type', { length: 30 }).notNull(), // PURCHASE, GIFT, TRADE, PRIZE, OTHER
  acquisitionDate: date('acquisition_date').notNull(),
  sourceName: varchar('source_name', { length: 200 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_acquisition_user').on(table.userId),
]);

// acquisition_item
export const acquisitionItem = pgTable('acquisition_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  acquisitionId: uuid('acquisition_id').references(() => acquisition.id, { onDelete: 'cascade' }).notNull(),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalCost: numeric('total_cost', { precision: 14, scale: 2 }).default('0.00').notNull(),
}, (table) => [
  index('ix_acquisition_item_acquisition').on(table.acquisitionId),
  index('ix_acquisition_item_exemplar').on(table.exemplarId),
]);

// sale
export const sale = pgTable('sale', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  saleDate: date('sale_date').notNull(),
  buyerName: varchar('buyer_name', { length: 200 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_sale_user').on(table.userId),
]);

// sale_item
export const saleItem = pgTable('sale_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  saleId: uuid('sale_id').references(() => sale.id, { onDelete: 'cascade' }).notNull(),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
}, (table) => [
  index('ix_sale_item_sale').on(table.saleId),
  index('ix_sale_item_exemplar').on(table.exemplarId),
]);

// write_off (baixa de exemplar por quebra, perda, avaria, etc.)
export const writeOff = pgTable('write_off', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id, { onDelete: 'cascade' }).notNull(),
  reason: varchar('reason', { length: 50 }).notNull(), // 'QUEBRA', 'PERDA', 'DEFEITO', 'DESCARTE', 'OUTRO'
  writeOffDate: date('write_off_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_write_off_user').on(table.userId),
  index('ix_write_off_exemplar').on(table.exemplarId),
]);
