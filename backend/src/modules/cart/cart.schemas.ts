import { z } from 'zod';

export const addCartItemSchema = z.object({
  offerId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const cartItemParamSchema = z.object({
  id: z.string().uuid(),
});
