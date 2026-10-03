import { z } from 'zod';

export const createCatalogRequestSchema = z.object({
  requestType: z.enum(['CREATE', 'UPDATE']),
  proposedData: z.record(z.any()),
  reason: z.string().optional().nullable(),
});

export type CreateCatalogRequestInput = z.infer<typeof createCatalogRequestSchema>;

export const reviewCatalogRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional().nullable(),
});

export type ReviewCatalogRequestInput = z.infer<typeof reviewCatalogRequestSchema>;

export const catalogRequestParamSchema = z.object({
  id: z.string().uuid(),
});
