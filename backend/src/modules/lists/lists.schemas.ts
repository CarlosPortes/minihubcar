import { z } from 'zod';

export const createListSchema = z.object({
  name: z.string().min(1, 'Nome da lista é obrigatório').max(150),
  description: z.string().optional().nullable(),
});

export type CreateListInput = z.infer<typeof createListSchema>;

export const addListItemSchema = z.object({
  variationId: z.string().uuid().optional().nullable(),
  exemplarId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
}).refine((data) => (data.variationId && !data.exemplarId) || (!data.variationId && data.exemplarId), {
  message: 'O item da lista deve referenciar exatamente uma Variação OU um Exemplar (XOR)',
});

export type AddListItemInput = z.infer<typeof addListItemSchema>;

export const listParamSchema = z.object({
  id: z.string().uuid(),
});

export const listItemParamSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});
