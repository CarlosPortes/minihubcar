import { FastifyInstance } from 'fastify';
import { CartController } from './cart.controller';
import { authenticate } from '../auth/auth.middleware';

export async function cartRoutes(app: FastifyInstance) {
  const controller = new CartController();

  app.get('/cart', { preHandler: [authenticate] }, controller.getCart);
  app.post('/cart/items', { preHandler: [authenticate] }, controller.addItem);
  app.patch('/cart/items/:id', { preHandler: [authenticate] }, controller.updateQuantity);
  app.delete('/cart/items/:id', { preHandler: [authenticate] }, controller.removeItem);
  app.delete('/cart', { preHandler: [authenticate] }, controller.clear);
}
