import { FastifyInstance } from 'fastify';
import { externalPreOrdersController } from './external-pre-orders.controller';
import { authenticate } from '../auth/auth.middleware';

export async function externalPreOrdersRoutes(app: FastifyInstance) {
  app.get('/external-pre-orders', { preHandler: [authenticate] }, externalPreOrdersController.list);
  app.get('/external-pre-orders/summary', { preHandler: [authenticate] }, externalPreOrdersController.getSummary);
  app.get('/external-pre-orders/:id', { preHandler: [authenticate] }, externalPreOrdersController.getById);
  app.post('/external-pre-orders', { preHandler: [authenticate] }, externalPreOrdersController.create);
  app.patch('/external-pre-orders/:id', { preHandler: [authenticate] }, externalPreOrdersController.update);
  app.post('/external-pre-orders/:id/payments', { preHandler: [authenticate] }, externalPreOrdersController.addPayment);
  app.post('/external-pre-orders/:id/convert-to-collection', { preHandler: [authenticate] }, externalPreOrdersController.convertToCollection);
  app.delete('/external-pre-orders/:id', { preHandler: [authenticate] }, externalPreOrdersController.delete);
}
