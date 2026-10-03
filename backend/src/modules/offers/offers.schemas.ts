import { z } from 'zod';

export const createOfferSchema = z.object({
  variationId: z.string().uuid(),
  title: z.string().min(3).max(250),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Preço deve ser um valor monetário válido (ex: 49.90)'),
  condition: z.enum(['LACRADO', 'NOVO_ABERTO', 'EXCELENTE', 'BOM', 'COM_DETALHE', 'CUSTOM']).default('LACRADO'),
  packagingState: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string()).default([]),
  initialStock: z.number().int().min(0).default(1),
  isPreOrder: z.boolean().default(false).optional(),
  preOrderEstimatedArrival: z.string().max(100).optional().nullable(),
  allowDepositAndBalance: z.boolean().default(true).optional(),
  depositAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor do sinal inválido').optional().nullable(),
  allowFullOnArrival: z.boolean().default(true).optional(),
  allowInstallments: z.boolean().default(false).optional(),
  maxInstallments: z.number().int().min(1).max(24).default(1).optional(),
  packageWeightGrams: z.number().int().min(1).max(50000).optional().nullable(),
  shippingAddressId: z.string().uuid().optional().nullable(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = z.object({
  title: z.string().min(3).max(250).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  condition: z.enum(['LACRADO', 'NOVO_ABERTO', 'EXCELENTE', 'BOM', 'COM_DETALHE', 'CUSTOM']).optional(),
  packagingState: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'INACTIVE']).optional(),
  photos: z.array(z.string()).optional(),
  isPreOrder: z.boolean().optional(),
  preOrderEstimatedArrival: z.string().max(100).optional().nullable(),
  allowDepositAndBalance: z.boolean().optional(),
  depositAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  allowFullOnArrival: z.boolean().optional(),
  allowInstallments: z.boolean().optional(),
  maxInstallments: z.number().int().min(1).max(24).optional(),
  packageWeightGrams: z.number().int().min(1).max(50000).optional().nullable(),
  shippingAddressId: z.string().uuid().optional().nullable(),
});

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

export const adjustStockSchema = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'LOSS']),
  quantity: z.number().int().positive('A quantidade deve ser maior que zero'),
  reason: z.string().max(250).optional().nullable(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const offerParamSchema = z.object({
  id: z.string().uuid(),
});
