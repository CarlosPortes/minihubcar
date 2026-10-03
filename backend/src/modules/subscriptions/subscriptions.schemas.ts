import { z } from 'zod';

export const subscribeInputSchema = z.object({
  planCode: z.enum(['FREE', 'PRO', 'MASTER', 'LEGEND']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'FREE']).default('PIX'),
});

export type SubscribeInput = z.infer<typeof subscribeInputSchema>;

export const adminListSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  planCode: z.enum(['ALL', 'FREE', 'PRO', 'MASTER', 'LEGEND']).default('ALL'),
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'CANCELED']).default('ALL'),
  billingCycle: z.enum(['ALL', 'MONTHLY', 'YEARLY']).default('ALL'),
});

export type AdminListSubscriptionsQuery = z.infer<typeof adminListSubscriptionsQuerySchema>;

export const adminUpdateSubscriptionSchema = z.object({
  planCode: z.enum(['FREE', 'PRO', 'MASTER', 'LEGEND']).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELED']).optional(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'FREE', 'MANUAL']).optional(),
  extendDays: z.number().int().min(1).optional(),
  expiresAt: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export type AdminUpdateSubscriptionInput = z.infer<typeof adminUpdateSubscriptionSchema>;
