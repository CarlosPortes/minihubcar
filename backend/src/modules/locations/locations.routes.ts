import { FastifyInstance } from 'fastify';
import { LocationsController } from './locations.controller';
import { authenticate } from '../auth/auth.middleware';

export async function locationsRoutes(app: FastifyInstance) {
  const controller = new LocationsController();

  app.get('/locations', { preHandler: [authenticate] }, controller.list);
  app.get('/locations/:id/grid', { preHandler: [authenticate] }, controller.getGrid);
  app.post('/locations', { preHandler: [authenticate] }, controller.create);
  app.patch('/locations/:id', { preHandler: [authenticate] }, controller.update);
  app.delete('/locations/:id', { preHandler: [authenticate] }, controller.delete);
}
