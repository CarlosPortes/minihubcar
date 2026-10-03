import { FastifyInstance } from 'fastify';
import { OrdersController } from './orders.controller';
import { authenticate } from '../auth/auth.middleware';

export async function ordersRoutes(app: FastifyInstance) {
  const controller = new OrdersController();

  app.post('/orders/checkout', { preHandler: [authenticate] }, controller.checkout);
  app.get('/orders/mine', { preHandler: [authenticate] }, controller.listMine);
  app.get('/orders/:id', { preHandler: [authenticate] }, controller.getById);
  app.get('/sellers/me/sales', { preHandler: [authenticate] }, controller.listSales);
  app.patch('/sellers/me/sales/:orderItemId/fulfillment', { preHandler: [authenticate] }, controller.updateSaleFulfillment);
}

