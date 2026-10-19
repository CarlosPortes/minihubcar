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
import { collectionExemplar } from './collection';

export const tradeProposal = pgTable('trade_proposal', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  requesterId: uuid('requester_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
  receiverId: uuid('receiver_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
  offeredExemplarId: uuid('offered_exemplar_id').references(() => collectionExemplar.id, { onDelete: 'cascade' }).notNull(),
  requestedExemplarId: uuid('requested_exemplar_id').references(() => collectionExemplar.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 25 }).default('PENDING').notNull(), // 'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_trade_proposal_requester').on(table.requesterId),
  index('ix_trade_proposal_receiver').on(table.receiverId),
  index('ix_trade_proposal_status').on(table.status),
]);

export type TradeProposal = typeof tradeProposal.$inferSelect;
export type NewTradeProposal = typeof tradeProposal.$inferInsert;
