import { z } from 'zod';

export const recordSaleSchema = z.object({
  exemplarId: z.string().uuid('ID do exemplar é obrigatório'),
  saleDate: z.string().min(10, 'Data da venda é obrigatória'), // YYYY-MM-DD
  buyerName: z.string().optional().nullable(),
  salePrice: z.coerce.number().min(0, 'Preço de venda deve ser maior ou igual a zero'),
  notes: z.string().optional().nullable(),
});

export type RecordSaleInput = z.infer<typeof recordSaleSchema>;

export const recordAcquisitionSchema = z.object({
  exemplarId: z.string().uuid('ID do exemplar é obrigatório'),
  acquisitionType: z.enum(['PURCHASE', 'GIFT', 'TRADE', 'PRIZE', 'OTHER']).default('PURCHASE'),
  acquisitionDate: z.string().min(10, 'Data de aquisição é obrigatória'),
  sourceName: z.string().optional().nullable(),
  unitCost: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export type RecordAcquisitionInput = z.infer<typeof recordAcquisitionSchema>;

export const recordWriteOffSchema = z.object({
  exemplarId: z.string().uuid('ID do exemplar é obrigatório'),
  reason: z.enum(['QUEBRA', 'PERDA', 'DEFEITO', 'DESCARTE', 'OUTRO']).default('QUEBRA'),
  writeOffDate: z.string().min(10, 'Data da baixa é obrigatória'), // YYYY-MM-DD
  notes: z.string().optional().nullable(),
});

export type RecordWriteOffInput = z.infer<typeof recordWriteOffSchema>;
