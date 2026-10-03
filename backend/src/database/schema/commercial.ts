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
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { appUser } from './auth';
import { variation } from './catalog';

// ============================================================================
// E06: VENDEDORES (SELLERS)
// ============================================================================

export const sellerProfile = pgTable('seller_profile', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull().unique(),
  storeName: varchar('store_name', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  bio: text('bio'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 50 }),
  postalCode: varchar('postal_code', { length: 20 }),
  street: varchar('street', { length: 255 }),
  number: varchar('number', { length: 50 }),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }),
  phone: varchar('phone', { length: 30 }),
  reputationScore: numeric('reputation_score', { precision: 3, scale: 2 }).default('5.00').notNull(),
  totalSalesCount: integer('total_sales_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_seller_profile_user').on(table.userId),
  uniqueIndex('ux_seller_profile_slug').on(table.slug),
  index('ix_seller_profile_city_state').on(table.city, table.state),
]);

export const sellerAuthorization = pgTable('seller_authorization', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED, SUSPENDED
  reviewedBy: uuid('reviewed_by').references(() => appUser.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_seller_auth_seller').on(table.sellerId),
  index('ix_seller_auth_status').on(table.status),
]);

export const sellerShippingAddress = pgTable('seller_shipping_address', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 100 }).default('Endereço Principal').notNull(),
  contactName: varchar('contact_name', { length: 150 }),
  postalCode: varchar('postal_code', { length: 20 }).notNull(),
  street: varchar('street', { length: 255 }).notNull(),
  number: varchar('number', { length: 50 }).notNull(),
  complement: varchar('complement', { length: 100 }),
  neighborhood: varchar('neighborhood', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  isDefault: boolean('is_default').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_seller_shipping_address_seller').on(table.sellerId),
]);

export const sellerShippingIntegration = pgTable('seller_shipping_integration', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'SUPERFRETE' | 'FRETE_RAPIDO' | 'MELHOR_ENVIO'
  apiKey: text('api_key').notNull(),
  extraConfig: jsonb('extra_config').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_seller_shipping_integration').on(table.sellerId, table.provider),
  index('ix_seller_shipping_integration_seller').on(table.sellerId),
]);

// ============================================================================
// E07: PRODUTO COMERCIAL & OFERTAS (COMMERCIAL PRODUCTS & OFFERS)
// ============================================================================

export const commercialProduct = pgTable('commercial_product', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  variationId: uuid('variation_id').references(() => variation.id).notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_commercial_product_variation').on(table.variationId),
]);

export const offer = pgTable('offer', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  commercialProductId: uuid('commercial_product_id').references(() => commercialProduct.id).notNull(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 250 }).notNull(),
  price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  condition: varchar('condition', { length: 50 }).default('LACRADO').notNull(), // LACRADO, NOVO_ABERTO, EXCELENTE, BOM, COM_DETALHE, CUSTOM
  packagingState: varchar('packaging_state', { length: 100 }), // PERFEITO, LEVE_DESGASTE, AMASSADO, VINCADO, SEM_BLISTER
  description: text('description'),
  status: varchar('status', { length: 30 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, PAUSED, OUT_OF_STOCK, INACTIVE
  photos: jsonb('photos').default(sql`'[]'::jsonb`).notNull(),
  isPreOrder: boolean('is_pre_order').default(false).notNull(),
  preOrderEstimatedArrival: varchar('pre_order_estimated_arrival', { length: 100 }),
  allowDepositAndBalance: boolean('allow_deposit_and_balance').default(true).notNull(),
  depositAmount: numeric('deposit_amount', { precision: 14, scale: 2 }),
  allowFullOnArrival: boolean('allow_full_on_arrival').default(true).notNull(),
  allowInstallments: boolean('allow_installments').default(false).notNull(),
  maxInstallments: integer('max_installments').default(1).notNull(),
  hasArrived: boolean('has_arrived').default(false).notNull(),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  packageWeightGrams: integer('package_weight_grams'), // Peso aproximado da embalagem em gramas (ex: 150g padrão)
  shippingAddressId: uuid('shipping_address_id').references(() => sellerShippingAddress.id), // Endereço de saída/expedição desta oferta
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_offer_commercial_product').on(table.commercialProductId),
  index('ix_offer_seller').on(table.sellerId),
  index('ix_offer_status').on(table.status),
  index('ix_offer_price').on(table.price),
]);

export const offerPriceHistory = pgTable('offer_price_history', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  offerId: uuid('offer_id').references(() => offer.id, { onDelete: 'cascade' }).notNull(),
  oldPrice: numeric('old_price', { precision: 14, scale: 2 }).notNull(),
  newPrice: numeric('new_price', { precision: 14, scale: 2 }).notNull(),
  changedBy: uuid('changed_by').references(() => appUser.id).notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_offer_price_history_offer').on(table.offerId),
]);

// ============================================================================
// E08: ESTOQUE COMERCIAL (COMMERCIAL INVENTORY)
// ============================================================================

export const commercialInventory = pgTable('commercial_inventory', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  offerId: uuid('offer_id').references(() => offer.id, { onDelete: 'cascade' }).notNull().unique(),
  onHand: integer('on_hand').default(0).notNull(),
  reserved: integer('reserved').default(0).notNull(),
  committed: integer('committed').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_commercial_inventory_offer').on(table.offerId),
]);

export const inventoryMovement = pgTable('inventory_movement', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  inventoryId: uuid('inventory_id').references(() => commercialInventory.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // STOCK_IN, STOCK_OUT, ADJUSTMENT, LOSS, RESERVATION_COMMIT, RESERVATION_CANCEL
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  idempotencyKey: varchar('idempotency_key', { length: 150 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_inventory_movement_inventory').on(table.inventoryId),
  index('ix_inventory_movement_type').on(table.type),
  index('ix_inventory_movement_idempotency').on(table.idempotencyKey),
]);

export const stockReservation = pgTable('stock_reservation', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  offerId: uuid('offer_id').references(() => offer.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  cartItemId: uuid('cart_item_id'),
  orderItemId: uuid('order_item_id'),
  quantity: integer('quantity').default(1).notNull(),
  status: varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE, COMMITTED, EXPIRED, CANCELLED
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_stock_reservation_offer').on(table.offerId),
  index('ix_stock_reservation_user').on(table.userId),
  index('ix_stock_reservation_status_expires').on(table.status, table.expiresAt),
]);

// ============================================================================
// E10: CARRINHO DE COMPRAS (CART)
// ============================================================================

export const cart = pgTable('cart', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_cart_user').on(table.userId),
]);

export const cartItem = pgTable('cart_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  cartId: uuid('cart_id').references(() => cart.id, { onDelete: 'cascade' }).notNull(),
  offerId: uuid('offer_id').references(() => offer.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_cart_item_cart').on(table.cartId),
  index('ix_cart_item_offer').on(table.offerId),
]);

// ============================================================================
// E11: PEDIDOS & SNAPSHOTS (ORDERS & ORDER ITEMS)
// ============================================================================

export const order = pgTable('order', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid('user_id').references(() => appUser.id).notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 30 }).default('PENDING_PAYMENT').notNull(), // PENDING_PAYMENT, PAID, PROCESSING, PARTIALLY_FULFILLED, FULFILLED, CANCELLED, REFUNDED
  totalItems: integer('total_items').default(1).notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  freightAmount: numeric('freight_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  deliveryMode: varchar('delivery_mode', { length: 30 }).default('DELIVERY').notNull(), // DELIVERY, GARAGE
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).default('PENDING').notNull(), // PENDING, NA_GARAGEM, ENTREGUE
  shippingAddressSnapshot: jsonb('shipping_address_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_order_number').on(table.orderNumber),
  index('ix_order_user').on(table.userId),
  index('ix_order_status').on(table.status),
]);

export const orderItem = pgTable('order_item', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  orderId: uuid('order_id').references(() => order.id, { onDelete: 'cascade' }).notNull(),
  offerId: uuid('offer_id').references(() => offer.id).notNull(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id).notNull(),
  variationId: uuid('variation_id').references(() => variation.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }).notNull(),
  variationSnapshot: jsonb('variation_snapshot').notNull(), // { name, brandName, castingName, scale, photoUrl, year, ... }
  sellerSnapshot: jsonb('seller_snapshot').notNull(), // { storeName, slug, city, state }
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).default('NA_GARAGEM').notNull(), // NA_GARAGEM, ENTREGUE
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_order_item_order').on(table.orderId),
  index('ix_order_item_seller').on(table.sellerId),
  index('ix_order_item_variation').on(table.variationId),
]);

// ============================================================================
// E12: PRÉ-VENDAS & PARCELAMENTO COM BAIXA MANUAL
// ============================================================================

export const preOrder = pgTable('pre_order', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  preOrderNumber: varchar('pre_order_number', { length: 50 }).notNull().unique(),
  buyerId: uuid('buyer_id').references(() => appUser.id).notNull(),
  sellerId: uuid('seller_id').references(() => sellerProfile.id).notNull(),
  offerId: uuid('offer_id').references(() => offer.id).notNull(),
  variationId: uuid('variation_id').references(() => variation.id).notNull(),
  status: varchar('status', { length: 30 }).default('RESERVED').notNull(), // RESERVED, AWAITING_ARRIVAL, ARRIVED, READY_FOR_DISPATCH, COMPLETED, CANCELLED
  paymentPlan: varchar('payment_plan', { length: 50 }).notNull(), // DEPOSIT_AND_BALANCE, FULL_ON_ARRIVAL, INSTALLMENTS
  quantity: integer('quantity').default(1).notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0.00').notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 14, scale: 2 }).notNull(),
  estimatedArrival: varchar('estimated_arrival', { length: 100 }),
  hasArrived: boolean('has_arrived').default(false).notNull(),
  arrivedAt: timestamp('arrived_at', { withTimezone: true }),
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 }).default('NA_GARAGEM').notNull(), // NA_GARAGEM, ENTREGUE
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  approvalReason: text('approval_reason'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references(() => appUser.id),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ux_pre_order_number').on(table.preOrderNumber),
  index('ix_pre_order_buyer').on(table.buyerId),
  index('ix_pre_order_seller').on(table.sellerId),
  index('ix_pre_order_offer').on(table.offerId),
  index('ix_pre_order_status').on(table.status),
]);

export const preOrderInstallment = pgTable('pre_order_installment', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  preOrderId: uuid('pre_order_id').references(() => preOrder.id, { onDelete: 'cascade' }).notNull(),
  installmentNumber: integer('installment_number').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  description: varchar('description', { length: 150 }).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  dueDate: date('due_date'),
  status: varchar('status', { length: 30 }).default('PENDING').notNull(), // PENDING, PAID, OVERDUE, CANCELLED
  paidAt: timestamp('paid_at', { withTimezone: true }),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }),
  paymentMethod: varchar('payment_method', { length: 50 }), // PIX, DINHEIRO, TRANSFERENCIA, CARTAO, OUTRO
  settledBy: uuid('settled_by').references(() => appUser.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ix_pre_order_installment_order').on(table.preOrderId),
  index('ix_pre_order_installment_status').on(table.status),
  index('ix_pre_order_installment_due_date').on(table.dueDate),
]);

