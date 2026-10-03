import { FastifyInstance } from 'fastify';
import { CatalogRequestsController } from './catalog-requests.controller';
import { authenticate } from '../auth/auth.middleware';

export async function catalogRequestsRoutes(app: FastifyInstance) {
  const controller = new CatalogRequestsController();

  app.get('/catalog-requests/mine', { preHandler: [authenticate] }, controller.listMine);
  app.get('/catalog-requests/pending', { preHandler: [authenticate] }, controller.listPending);
  app.post('/catalog-requests', { preHandler: [authenticate] }, controller.create);
  app.patch('/catalog-requests/:id/review', { preHandler: [authenticate] }, controller.review);
}
