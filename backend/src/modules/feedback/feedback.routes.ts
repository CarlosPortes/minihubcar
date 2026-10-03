import { FastifyInstance } from 'fastify';
import { feedbackController } from './feedback.controller';
import { authenticate } from '../auth/auth.middleware';

export async function feedbackRoutes(app: FastifyInstance) {
  app.get('/feedback', feedbackController.list);
  app.post('/feedback', { preHandler: [authenticate] }, feedbackController.create);
  app.patch('/feedback/:id/moderate', { preHandler: [authenticate] }, feedbackController.moderate);
}
