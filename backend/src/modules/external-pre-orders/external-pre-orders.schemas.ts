import { z } from 'zod';

export const createExternalPreOrderSchema = z.object({
  variationId: z.string().uuid().optional().nullable(),
  customMiniatureName: z.string().max(255).optional().nullable(),
  customBrand: z.string().max(100).optional().nullable(),
  customScale: z.string().max(50).default('1/64'),
  customPhotoUrl: z.string().max(1000).optional().nullable(),
  sellerName: z.string().min(1, 'Nome do vendedor/origem é obrigatório').max(200),
  sellerContact: z.string().max(150).optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  totalAmount: z.number().positive('Valor total deve ser maior que zero'),
  paidAmount: z.number().min(0, 'Valor pago não pode ser negativo').default(0),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data da reserva deve estar no formato YYYY-MM-DD').optional(),
  estimatedArrival: z.string().max(100).optional().nullable(),
  status: z.enum(['RESERVED', 'ARRIVED_AT_SELLER', 'SHIPPED', 'RECEIVED', 'CANCELLED']).default('RESERVED'),
  trackingCode: z.string().max(100).optional().nullable(),
  trackingCarrier: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateExternalPreOrderSchema = z.object({
  sellerName: z.string().max(200).optional(),
  sellerContact: z.string().max(150).optional().nullable(),
  customMiniatureName: z.string().max(255).optional().nullable(),
  customBrand: z.string().max(100).optional().nullable(),
  customScale: z.string().max(50).optional(),
  customPhotoUrl: z.string().max(1000).optional().nullable(),
  totalAmount: z.number().positive().optional(),
  status: z.enum(['RESERVED', 'ARRIVED_AT_SELLER', 'SHIPPED', 'RECEIVED', 'CANCELLED']).optional(),
  estimatedArrival: z.string().max(100).optional().nullable(),
  trackingCode: z.string().max(100).optional().nullable(),
  trackingCarrier: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const addExternalPaymentSchema = z.object({
  amount: z.number().positive('Valor do pagamento deve ser maior que zero'),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data do pagamento deve estar no formato YYYY-MM-DD').optional(),
  description: z.string().min(1, 'Descrição do pagamento é obrigatória').max(150),
  paymentMethod: z.string().max(50).default('PIX'),
  notes: z.string().optional().nullable(),
});

export const convertToCollectionSchema = z.object({
  conditionCode: z.string().default('MINT'),
  locationId: z.string().uuid().optional().nullable(),
  gridRow: z.number().int().optional().nullable(),
  gridColumn: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateExternalPreOrderInput = z.infer<typeof createExternalPreOrderSchema>;
export type UpdateExternalPreOrderInput = z.infer<typeof updateExternalPreOrderSchema>;
export type AddExternalPaymentInput = z.infer<typeof addExternalPaymentSchema>;
export type ConvertToCollectionInput = z.infer<typeof convertToCollectionSchema>;
