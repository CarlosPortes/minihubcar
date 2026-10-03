import { z } from 'zod';

export const addExemplarSchema = z.object({
  variationId: z.string().uuid('ID de variação inválido'),
  conditionCode: z.enum(['MINT', 'NEAR_MINT', 'GOOD', 'LOOSE', 'DAMAGED', 'CARDED']).default('MINT'),
  locationId: z.string().uuid().optional().nullable(),
  gridRow: z.coerce.number().int().min(1, 'Linha deve ser no mínimo 1').optional().nullable(),
  gridColumn: z.coerce.number().int().min(1, 'Coluna deve ser no mínimo 1').optional().nullable(),
  notes: z.string().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(), // YYYY-MM-DD
  acquisitionType: z.enum(['PURCHASE', 'GIFT', 'TRADE', 'PRIZE', 'OTHER']).optional(),
  cost: z.coerce.number().min(0).optional().nullable(),
  sourceName: z.string().optional().nullable(),
});

export type AddExemplarInput = z.infer<typeof addExemplarSchema>;

export const updateExemplarSchema = z.object({
  conditionCode: z.enum(['MINT', 'NEAR_MINT', 'GOOD', 'LOOSE', 'DAMAGED', 'CARDED']).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'SOLD', 'INACTIVE', 'DISCARDED']).optional(),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  purchaseLocation: z.string().max(255).optional().nullable(),
  automakerId: z.string().uuid().optional().nullable(),
  vehicleModelId: z.string().uuid().optional().nullable(),
});

export type UpdateExemplarInput = z.infer<typeof updateExemplarSchema>;

export const moveExemplarSchema = z.object({
  toLocationId: z.string().uuid('ID de destino obrigatório'),
  toGridRow: z.coerce.number().int().min(1, 'Linha deve ser no mínimo 1').optional().nullable(),
  toGridColumn: z.coerce.number().int().min(1, 'Coluna deve ser no mínimo 1').optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MoveExemplarInput = z.infer<typeof moveExemplarSchema>;

export const collectionFilterQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'SOLD', 'INACTIVE', 'DISCARDED']).default('ACTIVE'),
  conditionCode: z.string().optional(),
  locationId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  automakerId: z.string().uuid().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
});

export type CollectionFilterQuery = z.infer<typeof collectionFilterQuerySchema>;

export const exemplarParamSchema = z.object({
  id: z.string().uuid(),
});

export const importCollectionItemSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  year: z.coerce.number().int().optional().nullable(),
  conditionCode: z.enum(['MINT', 'NEAR_MINT', 'GOOD', 'LOOSE', 'DAMAGED', 'CARDED']).default('MINT'),
  cost: z.coerce.number().min(0).optional().nullable(),
  sourceName: z.string().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const importCollectionSchema = z.object({
  items: z.array(importCollectionItemSchema).min(1, 'Envie pelo menos 1 item para importação'),
});

export type ImportCollectionItemInput = z.infer<typeof importCollectionItemSchema>;
export type ImportCollectionInput = z.infer<typeof importCollectionSchema>;
