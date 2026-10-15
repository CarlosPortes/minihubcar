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
import { variation } from './catalog';
import { collectionExemplar } from './collection';

// ============================================================================
// PRÉ-VENDAS EXTERNAS DO COLECIONADOR (COLLECTOR EXTERNAL PRE-ORDERS)
// ============================================================================

export const collectorExternalPreOrder = pgTable(
  'collector_external_pre_order',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid('user_id').references(() => appUser.id, { onDelete: 'cascade' }).notNull(),

    // Vínculo opcional com a variação do catálogo oficial MiniHubCar
    variationId: uuid('variation_id').references(() => variation.id, { onDelete: 'set null' }),

    // Dados manuais (usados se variationId for nulo ou customizado)
    customMiniatureName: varchar('custom_miniature_name', { length: 255 }),
    customBrand: varchar('custom_brand', { length: 100 }),
    customScale: varchar('custom_scale', { length: 50 }).default('1/64'),
    customPhotoUrl: varchar('custom_photo_url', { length: 1000 }),

    // Identificação do Vendedor ou Grupo Externo
    sellerName: varchar('seller_name', { length: 200 }).notNull(),
    sellerContact: varchar('seller_contact', { length: 150 }),

    // Valores Financeiros
    quantity: integer('quantity').default(1).notNull(),
    totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
    remainingAmount: numeric('remaining_amount', { precision: 14, scale: 2 }).notNull(),

    // Cronograma & Prazos
    orderDate: date('order_date').default(sql`CURRENT_DATE`).notNull(),
    estimatedArrival: varchar('estimated_arrival', { length: 100 }),

    // Status: RESERVED, ARRIVED_AT_SELLER, SHIPPED, RECEIVED, CANCELLED
    status: varchar('status', { length: 30 }).default('RESERVED').notNull(),

    // Envio / Logística Externa
    trackingCode: varchar('tracking_code', { length: 100 }),
    trackingCarrier: varchar('tracking_carrier', { length: 50 }),

    // Conversão para o Acervo Físico (preenchido quando o item é recebido)
    convertedExemplarId: uuid('converted_exemplar_id').references(() => collectionExemplar.id, { onDelete: 'set null' }),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_ext_pre_order_user').on(table.userId),
    index('ix_ext_pre_order_status').on(table.status),
    index('ix_ext_pre_order_variation').on(table.variationId),
  ]
);

export const externalPreOrderPayment = pgTable(
  'external_pre_order_payment',
  {
    id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
    preOrderId: uuid('pre_order_id').references(() => collectorExternalPreOrder.id, { onDelete: 'cascade' }).notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    paidAt: date('paid_at').default(sql`CURRENT_DATE`).notNull(),
    description: varchar('description', { length: 150 }).notNull(), // Ex: "Sinal 50%", "Quitação", "Parcela 2"
    paymentMethod: varchar('payment_method', { length: 50 }).default('PIX'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ix_ext_pre_order_payment_order').on(table.preOrderId),
  ]
);

export type CollectorExternalPreOrder = typeof collectorExternalPreOrder.$inferSelect;
export type NewCollectorExternalPreOrder = typeof collectorExternalPreOrder.$inferInsert;
export type ExternalPreOrderPayment = typeof externalPreOrderPayment.$inferSelect;
export type NewExternalPreOrderPayment = typeof externalPreOrderPayment.$inferInsert;
