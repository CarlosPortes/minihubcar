import { FastifyInstance } from 'fastify';
import { ListsController } from './lists.controller';
import { authenticate } from '../auth/auth.middleware';

export async function listsRoutes(app: FastifyInstance) {
  const controller = new ListsController();

  app.get('/lists', { preHandler: [authenticate] }, controller.list);
  app.get('/lists/:id', { preHandler: [authenticate] }, controller.getById);
  app.post('/lists', { preHandler: [authenticate] }, controller.create);
  app.post('/lists/:id/items', { preHandler: [authenticate] }, controller.addItem);
  app.delete('/lists/:listId/items/:itemId', { preHandler: [authenticate] }, controller.removeItem);
  app.delete('/lists/:id', { preHandler: [authenticate] }, controller.delete);
}
