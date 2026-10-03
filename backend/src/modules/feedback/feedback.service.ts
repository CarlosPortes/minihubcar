import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../database/client';
import { feedbackSuggestion, appUser } from '../../database/schema';
import { CreateFeedbackInput, ModerateFeedbackInput } from './feedback.schemas';
import { NotFoundError } from '../../shared/errors/api-error';

export class FeedbackService {
  async listFeedbacks(type?: string, status?: string) {
    const conditions = [];
    if (type) conditions.push(eq(feedbackSuggestion.type, type));
    if (status) conditions.push(eq(feedbackSuggestion.status, status));

    return db
      .select({
        id: feedbackSuggestion.id,
        type: feedbackSuggestion.type,
        title: feedbackSuggestion.title,
        description: feedbackSuggestion.description,
        status: feedbackSuggestion.status,
        adminResponse: feedbackSuggestion.adminResponse,
        respondedAt: feedbackSuggestion.respondedAt,
        upvotesCount: feedbackSuggestion.upvotesCount,
        createdAt: feedbackSuggestion.createdAt,
        author: {
          id: appUser.id,
          name: appUser.name,
          avatarUrl: appUser.avatarUrl,
        },
      })
      .from(feedbackSuggestion)
      .innerJoin(appUser, eq(feedbackSuggestion.userId, appUser.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(feedbackSuggestion.createdAt));
  }

  async createFeedback(userId: string, input: CreateFeedbackInput) {
    const [created] = await db
      .insert(feedbackSuggestion)
      .values({
        userId,
        type: input.type,
        title: input.title.trim(),
        description: input.description.trim(),
        status: 'PENDING',
      })
      .returning();

    return created;
  }

  async moderateFeedback(adminUserId: string, id: string, input: ModerateFeedbackInput) {
    const [existing] = await db
      .select()
      .from(feedbackSuggestion)
      .where(eq(feedbackSuggestion.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Sugestão não encontrada');
    }

    const [updated] = await db
      .update(feedbackSuggestion)
      .set({
        status: input.status,
        adminResponse: input.adminResponse?.trim() || null,
        respondedBy: adminUserId,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(feedbackSuggestion.id, id))
      .returning();

    return updated;
  }
}

export const feedbackService = new FeedbackService();
