import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  numeric,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// miniature_brand
export const miniatureBrand = pgTable('miniature_brand', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 150 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_miniature_brand_normalized_name').on(table.normalizedName),
]);

// automaker
export const automaker = pgTable('automaker', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 150 }).notNull(),
  country: varchar('country', { length: 100 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_automaker_normalized_name').on(table.normalizedName),
]);

// vehicle_model
export const vehicleModel = pgTable('vehicle_model', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  automakerId: uuid('automaker_id').references(() => automaker.id).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 150 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_vehicle_model_automaker_name').on(table.automakerId, table.normalizedName),
  index('ix_vehicle_model_automaker').on(table.automakerId),
]);

// vehicle_generation
export const vehicleGeneration = pgTable('vehicle_generation', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  vehicleModelId: uuid('vehicle_model_id').references(() => vehicleModel.id).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  generationNumber: integer('generation_number'),
  startYear: smallint('start_year'),
  endYear: smallint('end_year'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_vehicle_generation_model').on(table.vehicleModelId),
]);

// series
export const series = pgTable('series', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  miniatureBrandId: uuid('miniature_brand_id').references(() => miniatureBrand.id).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 150 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_series_brand_name').on(table.miniatureBrandId, table.normalizedName),
  index('ix_series_brand').on(table.miniatureBrandId),
]);

// casting
export const casting = pgTable('casting', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  miniatureBrandId: uuid('miniature_brand_id').references(() => miniatureBrand.id).notNull(),
  automakerId: uuid('automaker_id').references(() => automaker.id),
  name: varchar('name', { length: 200 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 200 }).notNull(),
  description: text('description'),
  fantasyFlag: boolean('fantasy_flag').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_casting_brand_name').on(table.miniatureBrandId, table.normalizedName),
  index('ix_casting_brand').on(table.miniatureBrandId),
  index('ix_casting_automaker').on(table.automakerId),
]);

// casting_vehicle
export const castingVehicle = pgTable('casting_vehicle', {
  castingId: uuid('casting_id').references(() => casting.id).notNull(),
  vehicleModelId: uuid('vehicle_model_id').references(() => vehicleModel.id).notNull(),
  vehicleGenerationId: uuid('vehicle_generation_id').references(() => vehicleGeneration.id),
  relationshipType: varchar('relationship_type', { length: 30 }).default('EXACT').notNull(),
  notes: text('notes'),
}, (table) => [
  primaryKey({ columns: [table.castingId, table.vehicleModelId] }),
]);

// entertainment_franchise
export const entertainmentFranchise = pgTable('entertainment_franchise', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  normalizedName: varchar('normalized_name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_entertainment_franchise_name').on(table.normalizedName),
]);

// casting_franchise
export const castingFranchise = pgTable('casting_franchise', {
  castingId: uuid('casting_id').references(() => casting.id).notNull(),
  franchiseId: uuid('franchise_id').references(() => entertainmentFranchise.id).notNull(),
  roleType: varchar('role_type', { length: 50 }),
  notes: text('notes'),
}, (table) => [
  primaryKey({ columns: [table.castingId, table.franchiseId] }),
]);

// scale
export const scale = pgTable('scale', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  numerator: integer('numerator').default(1).notNull(),
  denominator: integer('denominator').notNull(),
  normalizedValue: numeric('normalized_value', { precision: 12, scale: 6 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
}, (table) => [
  uniqueIndex('ux_scale_ratio').on(table.numerator, table.denominator),
]);

// variation
export const variation = pgTable('variation', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  castingId: uuid('casting_id').references(() => casting.id).notNull(),
  seriesId: uuid('series_id').references(() => series.id),
  scaleId: uuid('scale_id').references(() => scale.id),
  name: varchar('name', { length: 200 }).notNull(),
  releaseYear: smallint('release_year'),
  color: varchar('color', { length: 100 }),
  finish: varchar('finish', { length: 100 }),
  packaging: varchar('packaging', { length: 100 }),
  edition: varchar('edition', { length: 100 }),
  seriesNumber: varchar('series_number', { length: 50 }),
  collectorNumber: varchar('collector_number', { length: 50 }),
  lineType: varchar('line_type', { length: 50 }),
  rarity: varchar('rarity', { length: 50 }),
  description: text('description'),
  photoUrl: varchar('photo_url', { length: 1000 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_variation_casting').on(table.castingId),
  index('ix_variation_series').on(table.seriesId),
  index('ix_variation_scale').on(table.scaleId),
  index('ix_variation_release_year').on(table.releaseYear),
  index('ix_variation_name').on(table.name),
  index('ix_variation_rarity').on(table.rarity),
]);

// identifier_type
export const identifierType = pgTable('identifier_type', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  miniatureBrandId: uuid('miniature_brand_id').references(() => miniatureBrand.id),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
}, (table) => [
  index('ix_identifier_type_brand').on(table.miniatureBrandId),
]);

// product_identifier
export const productIdentifier = pgTable('product_identifier', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  variationId: uuid('variation_id').references(() => variation.id).notNull(),
  identifierTypeId: uuid('identifier_type_id').references(() => identifierType.id).notNull(),
  code: varchar('code', { length: 150 }).notNull(),
  normalizedCode: varchar('normalized_code', { length: 150 }).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_product_identifier').on(table.identifierTypeId, table.normalizedCode),
  index('ix_product_identifier_variation').on(table.variationId),
]);
