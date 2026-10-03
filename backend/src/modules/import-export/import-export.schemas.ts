import { z } from 'zod';

export const importLocationItemSchema = z.object({
  name: z.string().min(1, 'Nome do local é obrigatório'),
  parentName: z.string().optional().nullable(),
  locationType: z.string().optional().nullable(),
  hasGrid: z.boolean().default(false),
  gridRows: z.number().int().min(1).optional().nullable(),
  gridColumns: z.number().int().min(1).optional().nullable(),
});

export const importLocationsPayloadSchema = z.object({
  items: z.array(importLocationItemSchema).min(1, 'Envie pelo menos 1 local para importação'),
});

export const importCollectionItemSchema = z.object({
  code: z.string().min(1, 'Código identificador (Mattel Code, SKU ou Barcode) é obrigatório'),
  quantity: z.number().int().min(1).default(1),
  conditionCode: z.string().default('MINT'),
  locationName: z.string().optional().nullable(),
  gridRow: z.number().int().min(1).optional().nullable(),
  gridColumn: z.number().int().min(1).optional().nullable(),
  purchasePrice: z.number().min(0).optional().nullable(),
  purchaseLocation: z.string().optional().nullable(),
  acquisitionDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const importCollectionPayloadSchema = z.object({
  items: z.array(importCollectionItemSchema).min(1, 'Envie pelo menos 1 item para importação'),
});

export type ImportLocationItem = z.infer<typeof importLocationItemSchema>;
export type ImportLocationsPayload = z.infer<typeof importLocationsPayloadSchema>;
export type ImportCollectionItem = z.infer<typeof importCollectionItemSchema>;
export type ImportCollectionPayload = z.infer<typeof importCollectionPayloadSchema>;
