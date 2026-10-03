import { FastifyInstance } from 'fastify';
import { MediaController } from './media.controller';
import { authenticate } from '../auth/auth.middleware';

export async function mediaRoutes(app: FastifyInstance) {
  const controller = new MediaController();

  app.post('/media/upload', { preHandler: [authenticate] }, controller.upload);
  app.post('/media/exemplars/:exemplarId/photos', { preHandler: [authenticate] }, controller.attachToExemplar);
}
