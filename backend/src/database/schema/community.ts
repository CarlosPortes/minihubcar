import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

// user_collection_photo
export const userCollectionPhoto = pgTable(
  'user_collection_photo',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    photoUrl: varchar('photo_url', { length: 1000 }).notNull(),
    caption: varchar('caption', { length: 200 }),
    status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
    reviewedBy: uuid('reviewed_by').references(() => appUser.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    sortOrder: integer('sort_order').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_user_col_photo_user').on(table.userId),
    index('ix_user_col_photo_status').on(table.status),
  ]
);

export type UserCollectionPhoto = typeof userCollectionPhoto.$inferSelect;
export type NewUserCollectionPhoto = typeof userCollectionPhoto.$inferInsert;

// direct_conversation (Conversas diretas entre colecionadores)
export const directConversation = pgTable(
  'direct_conversation',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    user1Id: uuid('user1_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    user2Id: uuid('user2_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    lastMessageText: text('last_message_text'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_direct_conv_user1').on(table.user1Id),
    index('ix_direct_conv_user2').on(table.user2Id),
    index('ix_direct_conv_last_message').on(table.lastMessageAt),
  ]
);

// direct_message (Mensagens individuais de chat)
export const directMessage = pgTable(
  'direct_message',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    conversationId: uuid('conversation_id').references(() => directConversation.id, { onDelete: 'cascade' }).notNull(),
    senderId: uuid('sender_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_direct_msg_conversation').on(table.conversationId),
    index('ix_direct_msg_sender').on(table.senderId),
    index('ix_direct_msg_created_at').on(table.createdAt),
  ]
);

export type DirectConversation = typeof directConversation.$inferSelect;
export type NewDirectConversation = typeof directConversation.$inferInsert;
export type DirectMessage = typeof directMessage.$inferSelect;
export type NewDirectMessage = typeof directMessage.$inferInsert;

