import { FastifyInstance } from 'fastify';
import { CollectionController } from './collection.controller';
import { authenticate } from '../auth/auth.middleware';

export async function collectionRoutes(app: FastifyInstance) {
  const controller = new CollectionController();

  app.get('/collection/exemplars', { preHandler: [authenticate] }, controller.list);
  app.get('/collection/exemplars/:id', { preHandler: [authenticate] }, controller.getById);
  app.post('/collection/exemplars', { preHandler: [authenticate] }, controller.create);
  app.post('/collection/exemplars/:id/move', { preHandler: [authenticate] }, controller.move);
  app.patch('/collection/exemplars/:id', { preHandler: [authenticate] }, controller.update);
  app.delete('/collection/exemplars/:id', { preHandler: [authenticate] }, controller.delete);
  app.post('/collection/import', { preHandler: [authenticate] }, controller.importCollection);

  // Public/community collection route (respects isCollectionPublic)
  app.get('/collection/users/:userId', controller.getPublicCollection);
}

