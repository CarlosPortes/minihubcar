import { FastifyInstance } from 'fastify';
import { OffersController } from './offers.controller';
import { authenticate } from '../auth/auth.middleware';

export async function offersRoutes(app: FastifyInstance) {
  const controller = new OffersController();

  // Public: get offer details
  app.get('/offers/:id', controller.getById);

  // Authenticated seller endpoints
  app.get('/sellers/me/offers', { preHandler: [authenticate] }, controller.listMyOffers);
  app.post('/sellers/me/offers', { preHandler: [authenticate] }, controller.create);
  app.patch('/sellers/me/offers/:id', { preHandler: [authenticate] }, controller.update);
  app.post('/sellers/me/offers/:id/inventory/adjust', { preHandler: [authenticate] }, controller.adjustStock);
}
