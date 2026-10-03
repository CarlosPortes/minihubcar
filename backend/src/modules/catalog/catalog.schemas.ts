import { z } from 'zod';

export const catalogSearchQuerySchema = z.object({
  q: z.string().optional(),
  brandId: z.string().uuid().optional(),
  automakerId: z.string().uuid().optional(),
  scaleId: z.string().uuid().optional(),
  seriesId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1800).max(2200).optional(),
  rarity: z.string().optional(),
  color: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;

export const variationParamSchema = z.object({
  id: z.string().uuid(),
});

export type VariationParam = z.infer<typeof variationParamSchema>;
