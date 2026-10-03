import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Nome do local é obrigatório').max(150),
  parentLocationId: z.string().uuid().optional().nullable(),
  locationType: z.string().max(50).optional(), // Ex: 'ROOM', 'SHELF', 'DISPLAY', 'BOX', 'DRAWER'
  hasGrid: z.boolean().optional().default(false),
  gridRows: z.coerce.number().int().min(1, 'Mínimo de 1 linha').max(100, 'Máximo de 100 linhas').optional().nullable(),
  gridColumns: z.coerce.number().int().min(1, 'Mínimo de 1 coluna').max(100, 'Máximo de 100 colunas').optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  parentLocationId: z.string().uuid().optional().nullable(),
  locationType: z.string().max(50).optional(),
  hasGrid: z.boolean().optional(),
  gridRows: z.coerce.number().int().min(1, 'Mínimo de 1 linha').max(100, 'Máximo de 100 linhas').optional().nullable(),
  gridColumns: z.coerce.number().int().min(1, 'Mínimo de 1 coluna').max(100, 'Máximo de 100 colunas').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const locationParamSchema = z.object({
  id: z.string().uuid(),
});
