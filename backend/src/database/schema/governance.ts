import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

// catalog_request
export const catalogRequest = pgTable('catalog_request', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  requestType: varchar('request_type', { length: 30 }).notNull(), // CREATE, UPDATE
  proposedData: jsonb('proposed_data').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, IN_REVIEW, APPROVED, REJECTED, CANCELLED
  reviewedBy: uuid('reviewed_by').references(() => appUser.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_catalog_request_user').on(table.userId),
  index('ix_catalog_request_status').on(table.status),
]);

// catalog_request_status_history
export const catalogRequestStatusHistory = pgTable('catalog_request_status_history', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  requestId: uuid('request_id').references(() => catalogRequest.id, { onDelete: 'cascade' }).notNull(),
  oldStatus: varchar('old_status', { length: 30 }),
  newStatus: varchar('new_status', { length: 30 }).notNull(),
  changedBy: uuid('changed_by').references(() => appUser.id).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  comment: text('comment'),
}, (table) => [
  index('ix_catalog_request_history_request').on(table.requestId),
]);

// audit_log
export const auditLog = pgTable('audit_log', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_audit_log_user').on(table.userId),
  index('ix_audit_log_entity').on(table.entityType, table.entityId),
]);

// feedback_suggestion (Sugestões genéricas, ideias de melhorias e feedbacks)
export const feedbackSuggestion = pgTable(
  'feedback_suggestion',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    type: varchar('type', { length: 50 }).default('FEATURE_REQUEST').notNull(), // FEATURE_REQUEST, USABILITY, COMMUNITY_IDEA, BUG_REPORT, OTHER
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, PLANNED, IN_PROGRESS, IMPLEMENTED, DECLINED
    adminResponse: text('admin_response'),
    respondedBy: uuid('responded_by').references(() => appUser.id),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    upvotesCount: integer('upvotes_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_feedback_suggestion_user').on(table.userId),
    index('ix_feedback_suggestion_status').on(table.status),
    index('ix_feedback_suggestion_type').on(table.type),
  ]
);

export type FeedbackSuggestion = typeof feedbackSuggestion.$inferSelect;
export type NewFeedbackSuggestion = typeof feedbackSuggestion.$inferInsert;

