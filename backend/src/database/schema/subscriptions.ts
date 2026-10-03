import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';

// subscription_plan
export const subscriptionPlan = pgTable(
  'subscription_plan',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    code: varchar('code', { length: 50 }).notNull(), // FREE, PRO, MASTER, LEGEND
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    monthlyPrice: numeric('monthly_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    yearlyPrice: numeric('yearly_price', { precision: 10, scale: 2 }).default('0.00').notNull(),
    maxMiniatures: integer('max_miniatures').notNull(), // -1 = ilimitado, 200, 650, 1000
    maxOtherCollectibles: integer('max_other_collectibles').notNull(), // -1 = ilimitado, 15, 50, 100
    features: jsonb('features').$type<string[]>().default([]).notNull(),
    badge: varchar('badge', { length: 50 }).default('FREE').notNull(),
    isPopular: boolean('is_popular').default(false).notNull(),
    sortOrder: integer('sort_order').default(1).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ux_subscription_plan_code').on(table.code),
  ]
);

// user_subscription
export const userSubscription = pgTable(
  'user_subscription',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),
    planId: uuid('plan_id').references(() => subscriptionPlan.id).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, EXPIRED, CANCELED
    billingCycle: varchar('billing_cycle', { length: 20 }).default('MONTHLY').notNull(), // MONTHLY, YEARLY, LIFETIME
    paymentMethod: varchar('payment_method', { length: 50 }).default('FREE'), // PIX, CREDIT_CARD, FREE, MANUAL
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    autoRenew: boolean('auto_renew').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ux_user_subscription_user').on(table.userId),
    index('ix_user_subscription_plan').on(table.planId),
    index('ix_user_subscription_status').on(table.status),
  ]
);

export type SubscriptionPlan = typeof subscriptionPlan.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlan.$inferInsert;
export type UserSubscription = typeof userSubscription.$inferSelect;
export type NewUserSubscription = typeof userSubscription.$inferInsert;
