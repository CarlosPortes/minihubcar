import { FastifyInstance } from 'fastify';
import { importExportController } from './import-export.controller';
import { authenticate } from '../auth/auth.middleware';

export async function importExportRoutes(app: FastifyInstance) {
  // Download templates (public or authenticated)
  app.get('/import/templates/:type', importExportController.downloadTemplate);

  // Import locations (authenticated)
  app.post('/import/locations', { preHandler: [authenticate] }, importExportController.importLocations);
  app.post('/import/locations/file', { preHandler: [authenticate] }, importExportController.importLocationsFile);

  // Import collection (authenticated)
  app.post('/import/collection', { preHandler: [authenticate] }, importExportController.importCollection);
  app.post('/import/collection/file', { preHandler: [authenticate] }, importExportController.importCollectionFile);
}
