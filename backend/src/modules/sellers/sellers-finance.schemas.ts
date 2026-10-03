import { z } from 'zod';

export const sellerFinanceFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['ALL', 'ORDERS', 'PRE_ORDERS']).optional().default('ALL'),
});

export type SellerFinanceFilter = z.infer<typeof sellerFinanceFilterSchema>;
