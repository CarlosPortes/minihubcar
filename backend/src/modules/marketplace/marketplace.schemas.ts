import { z } from 'zod';

export const marketplaceSearchQuerySchema = z.object({
  q: z.string().optional(),
  brandId: z.string().uuid().optional(),
  automakerId: z.string().uuid().optional(),
  scaleId: z.string().uuid().optional(),
  condition: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type MarketplaceSearchQuery = z.infer<typeof marketplaceSearchQuerySchema>;

export const marketplaceVariationParamSchema = z.object({
  variationId: z.string().uuid(),
});
