import { z } from 'zod';

export const createPixChargeSchema = z.object({
  referenceType: z.enum(['SUBSCRIPTION', 'PRE_ORDER_INSTALLMENT', 'DONATION', 'ORDER']),
  referenceId: z.string().max(120).optional(),
  amount: z.number().positive('O valor deve ser maior que zero'),
  description: z.string().max(255).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreatePixChargeInput = z.infer<typeof createPixChargeSchema>;

export const verifyPaymentSchema = z.object({
  chargeId: z.string().uuid(),
});

export const webhookSchema = z.any();
