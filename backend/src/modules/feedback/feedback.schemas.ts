import { z } from 'zod';

export const feedbackTypeEnum = z.enum([
  'FEATURE_REQUEST',
  'USABILITY',
  'COMMUNITY_IDEA',
  'BUG_REPORT',
  'OTHER',
]);

export const createFeedbackSchema = z.object({
  type: feedbackTypeEnum.default('FEATURE_REQUEST'),
  title: z.string().min(5, 'Título deve ter no mínimo 5 caracteres').max(200),
  description: z.string().min(10, 'Descrição detalhada é obrigatória (mínimo 10 caracteres)'),
});

export const moderateFeedbackSchema = z.object({
  status: z.enum(['PENDING', 'PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'DECLINED']),
  adminResponse: z.string().optional().nullable(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type ModerateFeedbackInput = z.infer<typeof moderateFeedbackSchema>;
