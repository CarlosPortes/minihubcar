import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  date,
  integer,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';
import { variation, automaker, vehicleModel } from './catalog';

// condition_type
export const conditionType = pgTable('condition_type', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
}, (table) => [
  uniqueIndex('ux_condition_type_code').on(table.code),
]);

// collection_exemplar
export const collectionExemplar = pgTable('collection_exemplar', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  variationId: uuid('variation_id').references(() => variation.id).notNull(),
  conditionTypeId: uuid('condition_type_id').references(() => conditionType.id).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, SOLD, INACTIVE
  notes: text('notes'),
  acquisitionDate: date('acquisition_date'),
  purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }),
  purchaseLocation: varchar('purchase_location', { length: 255 }),
  automakerId: uuid('automaker_id').references(() => automaker.id),
  vehicleModelId: uuid('vehicle_model_id').references(() => vehicleModel.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_collection_exemplar_user').on(table.userId),
  index('ix_collection_exemplar_user_variation').on(table.userId, table.variationId),
  index('ix_collection_exemplar_variation').on(table.variationId),
  index('ix_collection_exemplar_automaker').on(table.automakerId),
]);

// location (hierarchical per user)
export const location = pgTable('location', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  parentLocationId: uuid('parent_location_id').references((): any => location.id),
  name: varchar('name', { length: 150 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 150 }).notNull(),
  locationType: varchar('location_type', { length: 50 }),
  hasGrid: boolean('has_grid').default(false).notNull(),
  gridRows: integer('grid_rows'),
  gridColumns: integer('grid_columns'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_location_user').on(table.userId),
  index('ix_location_parent').on(table.parentLocationId),
]);

// exemplar_location (current and history)
export const exemplarLocation = pgTable('exemplar_location', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id).notNull(),
  locationId: uuid('location_id').references(() => location.id).notNull(),
  gridRow: integer('grid_row'),
  gridColumn: integer('grid_column'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  isCurrent: boolean('is_current').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_exemplar_location_exemplar').on(table.exemplarId),
  index('ix_exemplar_location_user').on(table.userId),
  index('ix_exemplar_location_location').on(table.locationId),
  uniqueIndex('ux_location_slot_current')
    .on(table.locationId, table.gridRow, table.gridColumn)
    .where(sql`is_current = true AND grid_row IS NOT NULL AND grid_column IS NOT NULL`),
]);

// location_movement
export const locationMovement = pgTable('location_movement', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id).notNull(),
  fromLocationId: uuid('from_location_id').references(() => location.id),
  fromGridRow: integer('from_grid_row'),
  fromGridColumn: integer('from_grid_column'),
  toLocationId: uuid('to_location_id').references(() => location.id).notNull(),
  toGridRow: integer('to_grid_row'),
  toGridColumn: integer('to_grid_column'),
  movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
}, (table) => [
  index('ix_location_movement_exemplar').on(table.exemplarId),
  index('ix_location_movement_user').on(table.userId),
]);
