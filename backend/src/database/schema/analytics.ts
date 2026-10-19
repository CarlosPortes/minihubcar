import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

export const siteVisit = pgTable(
  'site_visit',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    path: varchar('path', { length: 500 }).notNull(),
    visitorId: varchar('visitor_id', { length: 100 }).notNull(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'set null' }),
    ipHash: varchar('ip_hash', { length: 64 }),
    userAgent: text('user_agent'),
    referer: varchar('referer', { length: 500 }),
    deviceType: varchar('device_type', { length: 20 }).default('DESKTOP').notNull(), // DESKTOP, MOBILE, TABLET
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_site_visit_created_at').on(table.createdAt),
    index('ix_site_visit_path').on(table.path),
    index('ix_site_visit_visitor').on(table.visitorId),
    index('ix_site_visit_user').on(table.userId),
  ]
);

export type SiteVisit = typeof siteVisit.$inferSelect;
export type NewSiteVisit = typeof siteVisit.$inferInsert;
