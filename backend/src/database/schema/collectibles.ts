import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';
import { location } from './collection';

// custom_collectible (Funkos, Bustos, Estátuas, Resinas, Action Figures)
export const customCollectible = pgTable(
  'custom_collectible',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(), // FUNKO_POP, STATUE_RESIN, BUST, ACTION_FIGURE, DIORAMA, MEMORABILIA, OTHER
    manufacturer: varchar('manufacturer', { length: 150 }), // Funko, Iron Studios, Hot Toys, NECA, Kotobukiya, etc.
    franchise: varchar('franchise', { length: 150 }), // Star Wars, Marvel, DC, Batman, Anime, etc.
    characterOrSubject: varchar('character_or_subject', { length: 150 }),
    releaseYear: integer('release_year'),
    edition: varchar('edition', { length: 150 }), // Exclusivo, Chase, Glow, Limitado 1/500
    scale: varchar('scale', { length: 50 }), // 1/10, 1/6, 1/4, Padrão Funko, etc.
    conditionCode: varchar('condition_code', { length: 50 }).default('MINT').notNull(), // MINT, IN_BOX, LOOSE, DAMAGED
    purchasePrice: numeric('purchase_price', { precision: 14, scale: 2 }),
    purchaseLocation: varchar('purchase_location', { length: 255 }),
    acquisitionDate: date('acquisition_date'),
    locationId: uuid('location_id').references(() => location.id, { onDelete: 'set null' }),
    gridRow: integer('grid_row'),
    gridColumn: integer('grid_column'),
    photoUrl: varchar('photo_url', { length: 1000 }),
    notes: text('notes'),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, SOLD, INACTIVE
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_custom_collectible_user').on(table.userId),
    index('ix_custom_collectible_category').on(table.category),
    index('ix_custom_collectible_location').on(table.locationId),
    index('ix_custom_collectible_franchise').on(table.franchise),
  ]
);

export type CustomCollectible = typeof customCollectible.$inferSelect;
export type NewCustomCollectible = typeof customCollectible.$inferInsert;
