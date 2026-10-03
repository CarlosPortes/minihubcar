import { FastifyInstance } from 'fastify';
import { WishlistController } from './wishlist.controller';
import { authenticate } from '../auth/auth.middleware';

export async function wishlistRoutes(app: FastifyInstance) {
  const controller = new WishlistController();

  app.get('/wishlist', { preHandler: [authenticate] }, controller.list);
  app.post('/wishlist', { preHandler: [authenticate] }, controller.add);
  app.patch('/wishlist/:id', { preHandler: [authenticate] }, controller.update);
  app.delete('/wishlist/:id', { preHandler: [authenticate] }, controller.remove);
}
