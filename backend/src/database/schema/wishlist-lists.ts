import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';
import { variation } from './catalog';
import { collectionExemplar } from './collection';

// wishlist_item
export const wishlistItem = pgTable('wishlist_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  variationId: uuid('variation_id').references(() => variation.id).notNull(),
  priority: integer('priority').default(0).notNull(), // 0=LOW, 1=MEDIUM, 2=HIGH, 3=URGENT
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_wishlist_user_variation').on(table.userId, table.variationId),
  index('ix_wishlist_user').on(table.userId),
]);

// custom_list
export const customList = pgTable('custom_list', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_custom_list_user').on(table.userId),
]);

// custom_list_item (XOR variation XOR exemplar)
export const customListItem = pgTable('custom_list_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  listId: uuid('list_id').references(() => customList.id, { onDelete: 'cascade' }).notNull(),
  variationId: uuid('variation_id').references(() => variation.id),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('ix_custom_list_item_list').on(table.listId),
]);
