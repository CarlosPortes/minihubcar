import { z } from 'zod';

export const collectibleCategoryEnum = z.enum([
  'FUNKO_POP',
  'STATUE_RESIN',
  'BUST',
  'ACTION_FIGURE',
  'DIORAMA',
  'MEMORABILIA',
  'OTHER',
]);

export const createCollectibleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  category: collectibleCategoryEnum,
  manufacturer: z.string().max(150).optional().nullable(),
  franchise: z.string().max(150).optional().nullable(),
  characterOrSubject: z.string().max(150).optional().nullable(),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  edition: z.string().max(150).optional().nullable(),
  scale: z.string().max(50).optional().nullable(),
  conditionCode: z.enum(['MINT', 'IN_BOX', 'LOOSE', 'DAMAGED']).default('MINT'),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  purchaseLocation: z.string().max(255).optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  gridRow: z.coerce.number().int().min(1).optional().nullable(),
  gridColumn: z.coerce.number().int().min(1).optional().nullable(),
  photoUrl: z.string().url().max(1000).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCollectibleSchema = createCollectibleSchema.partial();

export const collectibleFilterQuerySchema = z.object({
  category: collectibleCategoryEnum.optional(),
  franchise: z.string().optional(),
  locationId: z.string().uuid().optional(),
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'SOLD', 'INACTIVE']).default('ACTIVE'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type CreateCollectibleInput = z.infer<typeof createCollectibleSchema>;
export type UpdateCollectibleInput = z.infer<typeof updateCollectibleSchema>;
export type CollectibleFilterQuery = z.infer<typeof collectibleFilterQuerySchema>;
