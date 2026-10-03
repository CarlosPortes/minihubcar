import { FastifyInstance } from 'fastify';
import { CatalogController } from './catalog.controller';

export async function catalogRoutes(app: FastifyInstance) {
  const controller = new CatalogController();

  app.get('/catalog/search', controller.search);
  app.get('/catalog/variations/:id', controller.getById);
  app.get('/catalog/filters', controller.filters);
  app.get('/catalog/series', controller.series);
  app.get('/catalog/automakers', controller.automakers);
  app.get('/catalog/vehicle-models', controller.vehicleModels);
}
