import { z } from 'zod';

export const identifyMiniatureSchema = z.object({
  imageBase64: z.string().min(10, 'Imagem em base64 é obrigatória'),
  mimeType: z.string().optional().default('image/jpeg'),
  textHint: z.string().optional(),
});

export type IdentifyMiniatureInput = z.infer<typeof identifyMiniatureSchema>;
