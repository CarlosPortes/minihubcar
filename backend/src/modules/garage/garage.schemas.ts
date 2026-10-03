import { z } from 'zod';

export const shippingQuoteSchema = z.object({
  sellerId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1, 'Selecione pelo menos 1 item para cotar o envio'),
  destinationZip: z.string().min(8, 'CEP de destino deve ter pelo menos 8 dígitos').max(20),
  customWeightGrams: z.number().int().min(50).max(50000).optional().nullable(),
  includeInsurance: z.boolean().default(true).optional(),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;

export const dispatchGarageSchema = z.object({
  sellerId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1, 'Selecione pelo menos 1 item para despachar'),
  customWeightGrams: z.number().int().min(50).max(50000).optional().nullable(),
  includeInsurance: z.boolean().default(true).optional(),
  insuranceAmount: z.number().min(0).optional().nullable(),
  shippingMethod: z.object({
    carrier: z.string().min(2),
    serviceName: z.string().min(2),
    price: z.number().min(0),
    basePrice: z.number().min(0).optional(),
    insuranceCost: z.number().min(0).optional(),
    deliveryDays: z.number().int().min(1),
  }),
  shippingAddress: z.object({
    recipientName: z.string().min(2, 'Nome do destinatário obrigatório').max(150),
    postalCode: z.string().min(8, 'CEP obrigatório').max(20),
    street: z.string().min(2, 'Logradouro obrigatório').max(255),
    number: z.string().min(1, 'Número obrigatório').max(50),
    complement: z.string().max(100).optional().nullable(),
    neighborhood: z.string().min(1, 'Bairro obrigatório').max(100),
    city: z.string().min(2, 'Cidade obrigatória').max(100),
    state: z.string().min(2, 'Estado (UF) obrigatório').max(50),
    phone: z.string().max(30).optional().nullable(),
  }),
});

export type DispatchGarageInput = z.infer<typeof dispatchGarageSchema>;

export const cancelGarageItemParamSchema = z.object({
  orderItemId: z.string().uuid(),
});

export const cancelGarageItemBodySchema = z.object({
  reason: z.string().max(250).optional().nullable(),
});

export type CancelGarageItemInput = z.infer<typeof cancelGarageItemBodySchema>;
