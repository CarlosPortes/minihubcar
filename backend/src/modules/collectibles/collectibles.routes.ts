import { FastifyInstance } from 'fastify';
import { collectiblesController } from './collectibles.controller';
import { authenticate } from '../auth/auth.middleware';

export async function collectiblesRoutes(app: FastifyInstance) {
  app.get('/collectibles', { preHandler: [authenticate] }, collectiblesController.list);
  app.get('/collectibles/summary', { preHandler: [authenticate] }, collectiblesController.getSummary);
  app.get('/collectibles/:id', { preHandler: [authenticate] }, collectiblesController.getById);
  app.post('/collectibles', { preHandler: [authenticate] }, collectiblesController.create);
  app.patch('/collectibles/:id', { preHandler: [authenticate] }, collectiblesController.update);
  app.delete('/collectibles/:id', { preHandler: [authenticate] }, collectiblesController.delete);
}
