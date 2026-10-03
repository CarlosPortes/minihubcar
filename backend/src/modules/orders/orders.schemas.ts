import { z } from 'zod';

export const checkoutSchema = z.object({
  deliveryMode: z.enum(['DELIVERY', 'GARAGE']).default('DELIVERY'),
  shippingAddress: z.object({
    recipientName: z.string().min(2).max(150),
    street: z.string().min(2).max(200),
    number: z.string().min(1).max(50),
    complement: z.string().max(100).optional().nullable(),
    neighborhood: z.string().max(100).optional().nullable(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(50),
    zipCode: z.string().min(8).max(20),
  }).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderParamSchema = z.object({
  id: z.string().uuid(),
});

export const orderItemParamSchema = z.object({
  orderItemId: z.string().uuid(),
});

export const updateSaleFulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(['NA_GARAGEM', 'AGUARDANDO_ENVIO', 'ENTREGUE']),
});

export type UpdateSaleFulfillmentInput = z.infer<typeof updateSaleFulfillmentSchema>;

