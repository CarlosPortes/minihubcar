import { FastifyReply, FastifyRequest } from 'fastify';
import { feedbackService } from './feedback.service';
import { createFeedbackSchema, moderateFeedbackSchema } from './feedback.schemas';

export class FeedbackController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { type?: string; status?: string };
    const items = await feedbackService.listFeedbacks(query.type, query.status);
    return reply.status(200).send({ data: items });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const input = createFeedbackSchema.parse(request.body);
    const created = await feedbackService.createFeedback(user.sub, input);
    return reply.status(201).send({ data: created });
  };

  moderate = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = moderateFeedbackSchema.parse(request.body);
    const updated = await feedbackService.moderateFeedback(user.sub, id, input);
    return reply.status(200).send({ data: updated });
  };
}

export const feedbackController = new FeedbackController();
