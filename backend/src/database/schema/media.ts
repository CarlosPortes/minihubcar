import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  bigint,
  integer,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { collectionExemplar } from './collection';

// photo
export const photo = pgTable('photo', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  url: varchar('url', { length: 1000 }),
  mimeType: varchar('mime_type', { length: 100 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// exemplar_photo
export const exemplarPhoto = pgTable('exemplar_photo', {
  exemplarId: uuid('exemplar_id').references(() => collectionExemplar.id, { onDelete: 'cascade' }).notNull(),
  photoId: uuid('photo_id').references(() => photo.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
}, (table) => [
  primaryKey({ columns: [table.exemplarId, table.photoId] }),
]);
