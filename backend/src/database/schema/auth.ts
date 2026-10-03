import { pgTable, uuid, varchar, text, timestamp, primaryKey, uniqueIndex, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// app_user
export const appUser = pgTable('app_user', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  normalizedEmail: varchar('normalized_email', { length: 320 }).notNull(),
  passwordHash: text('password_hash'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  whatsapp: varchar('whatsapp', { length: 30 }),
  instagram: varchar('instagram', { length: 100 }),
  website: varchar('website', { length: 255 }),
  postalCode: varchar('postal_code', { length: 20 }),
  street: varchar('street', { length: 255 }),
  number: varchar('number', { length: 50 }),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
  isCollectionPublic: boolean('is_collection_public').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('ux_app_user_email').on(table.normalizedEmail),
]);

// role
export const role = pgTable('role', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
}, (table) => [
  uniqueIndex('ux_role_code').on(table.code),
]);

// permission
export const permission = pgTable('permission', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  code: varchar('code', { length: 100 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
}, (table) => [
  uniqueIndex('ux_permission_code').on(table.code),
]);

// user_role
export const userRole = pgTable('user_role', {
  userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => role.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId] }),
]);

// role_permission
export const rolePermission = pgTable('role_permission', {
  roleId: uuid('role_id').references(() => role.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permission.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] }),
]);

// password_reset_token
export const passwordResetToken = pgTable('password_reset_token', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_password_reset_token').on(table.token),
  index('ix_password_reset_user').on(table.userId),
]);
