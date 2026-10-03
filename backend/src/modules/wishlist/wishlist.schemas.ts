import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  variationId: z.string().uuid('ID de variação inválido'),
  priority: z.coerce.number().int().min(0).max(3).default(1), // 0=LOW, 1=MEDIUM, 2=HIGH, 3=URGENT
  notes: z.string().optional().nullable(),
});

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;

export const updateWishlistItemSchema = z.object({
  priority: z.coerce.number().int().min(0).max(3).optional(),
  notes: z.string().optional().nullable(),
});

export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;

export const wishlistItemParamSchema = z.object({
  id: z.string().uuid(),
});
