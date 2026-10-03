import { z } from 'zod';

export const customInstallmentItemSchema = z.object({
  installmentNumber: z.number().int().min(1),
  description: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (YYYY-MM-DD)').optional().nullable(),
});

export const createPreOrderReservationSchema = z.object({
  offerId: z.string().uuid(),
  paymentPlan: z.enum(['DEPOSIT_AND_BALANCE', 'FULL_ON_ARRIVAL', 'INSTALLMENTS']),
  quantity: z.number().int().min(1).default(1),
  installmentsCount: z.number().int().min(1).max(24).optional().default(1),
  dueDateDay: z.number().int().min(1).max(28).optional().default(10),
  notes: z.string().max(1000).optional().nullable(),
  customInstallments: z.array(customInstallmentItemSchema).optional(),
});

export type CreatePreOrderReservationInput = z.infer<typeof createPreOrderReservationSchema>;

export const settleInstallmentSchema = z.object({
  paidAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor pago inválido').optional(),
  paidAt: z.string().datetime().optional(),
  paymentMethod: z.enum(['PIX', 'DINHEIRO', 'TRANSFERENCIA', 'CARTAO', 'OUTRO']).default('PIX'),
  notes: z.string().max(500).optional().nullable(),
});

export type SettleInstallmentInput = z.infer<typeof settleInstallmentSchema>;

export const updateInstallmentSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (YYYY-MM-DD)').optional().nullable(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor da parcela inválido').optional(),
  description: z.string().min(1).max(255).optional(),
});

export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;


export const preOrderStatusEnum = z.enum([
  'RESERVED',
  'PENDING_APPROVAL',
  'AWAITING_ARRIVAL',
  'ARRIVED',
  'READY_FOR_DISPATCH',
  'COMPLETED',
  'CANCELLED',
]);

export const updatePreOrderStatusSchema = z.object({
  status: preOrderStatusEnum,
  notes: z.string().max(500).optional().nullable(),
});

export type UpdatePreOrderStatusInput = z.infer<typeof updatePreOrderStatusSchema>;

export const preOrderParamSchema = z.object({
  preOrderId: z.string().uuid(),
});

export const installmentParamSchema = z.object({
  preOrderId: z.string().uuid(),
  installmentId: z.string().uuid(),
});

export const preOrdersQuerySchema = z.object({
  status: preOrderStatusEnum.optional(),
  installmentStatus: z.enum(['PENDING', 'PAID', 'OVERDUE']).optional(),
  search: z.string().optional(),
});

export type PreOrdersQuery = z.infer<typeof preOrdersQuerySchema>;

export const offerParamSchema = z.object({
  offerId: z.string().uuid(),
});

export const markCampaignArrivalSchema = z.object({
  arrivedAt: z.string().optional().nullable(),
});

export type MarkCampaignArrivalInput = z.infer<typeof markCampaignArrivalSchema>;

export const updatePreOrderFulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(['NA_GARAGEM', 'ENTREGUE']),
  hasArrived: z.boolean().optional(),
  arrivedAt: z.string().optional().nullable(),
});

export type UpdatePreOrderFulfillmentInput = z.infer<typeof updatePreOrderFulfillmentSchema>;

export const dashboardQuerySchema = z.object({
  filter: z.enum(['ALL', 'OPEN', 'CLOSED', 'ARRIVED']).optional().default('ALL'),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const collectorsStatusQuerySchema = z.object({
  scope: z.enum(['my', 'all']).optional().default('my'),
  status: z.enum(['ALL', 'GREEN', 'YELLOW', 'RED']).optional().default('ALL'),
  search: z.string().optional(),
});

export type CollectorsStatusQuery = z.infer<typeof collectorsStatusQuerySchema>;

export const collectorParamSchema = z.object({
  collectorId: z.string().uuid(),
});

export const approvePreOrderReservationSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type ApprovePreOrderReservationInput = z.infer<typeof approvePreOrderReservationSchema>;

export const rejectPreOrderReservationSchema = z.object({
  reason: z.string().min(1, 'Informe o motivo da recusa').max(500),
});

export type RejectPreOrderReservationInput = z.infer<typeof rejectPreOrderReservationSchema>;

// ============================================================================
// MANUAL PRE-ORDER & BATCH IMPORT SCHEMAS
// ============================================================================

export const manualInstallmentItemSchema = z.object({
  installmentNumber: z.number().int().min(1),
  totalInstallments: z.number().int().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor da parcela inválido'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (YYYY-MM-DD)'),
  status: z.enum(['PENDING', 'PAID']).default('PENDING'),
  paidAt: z.string().optional().nullable(),
  settledAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor baixado inválido').optional().nullable(),
  paymentMethod: z.enum(['PIX', 'DINHEIRO', 'TRANSFERENCIA', 'CARTAO', 'OUTRO']).default('PIX'),
  description: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type ManualInstallmentItem = z.infer<typeof manualInstallmentItemSchema>;

export const createManualPreOrderSchema = z.object({
  collector: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(150),
    email: z.string().email('E-mail inválido').max(320),
    whatsapp: z.string().max(30).optional().nullable(),
  }),
  miniature: z.object({
    name: z.string().min(2, 'Nome da miniatura deve ter no mínimo 2 caracteres').max(255),
    brandName: z.string().max(100).optional().nullable(),
    scaleDenominator: z.number().int().min(1).default(64),
    photoUrl: z.string().url().optional().nullable(),
    estimatedArrival: z.string().max(100).optional().nullable(),
    quantity: z.number().int().min(1).default(1),
  }),
  financial: z.object({
    totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor total inválido'),
    paymentPlan: z.enum(['DEPOSIT_AND_BALANCE', 'FULL_ON_ARRIVAL', 'INSTALLMENTS']).default('INSTALLMENTS'),
    installments: z.array(manualInstallmentItemSchema).min(1, 'Informe pelo menos uma parcela'),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export type CreateManualPreOrderInput = z.infer<typeof createManualPreOrderSchema>;

export const importPreOrdersBatchSchema = z.object({
  items: z.array(createManualPreOrderSchema).min(1, 'Ao menos um item deve ser importado'),
});

export type ImportPreOrdersBatchInput = z.infer<typeof importPreOrdersBatchSchema>;

