import { z } from 'zod';

export const createTradeProposalSchema = z.object({
  receiverId: z.string().uuid('ID do colecionador destinatário inválido'),
  offeredExemplarId: z.string().uuid('ID do exemplar oferecido inválido'),
  requestedExemplarId: z.string().uuid('ID do exemplar solicitado inválido').optional(),
  message: z.string().max(1000).optional(),
});

export type CreateTradeProposalInput = z.infer<typeof createTradeProposalSchema>;

export const toggleTradeSchema = z.object({
  exemplarId: z.string().uuid('ID do exemplar inválido'),
  isForTrade: z.boolean(),
});

export type ToggleTradeInput = z.infer<typeof toggleTradeSchema>;

export const updateProposalStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED']),
});

export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
