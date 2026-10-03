import { FastifyInstance } from 'fastify';
import { AcquisitionsSalesController } from './acquisitions-sales.controller';
import { authenticate } from '../auth/auth.middleware';

export async function acquisitionsSalesRoutes(app: FastifyInstance) {
  const controller = new AcquisitionsSalesController();

  app.get('/sales', { preHandler: [authenticate] }, controller.listSales);
  app.post('/sales', { preHandler: [authenticate] }, controller.recordSale);

  app.get('/acquisitions', { preHandler: [authenticate] }, controller.listAcquisitions);
  app.post('/acquisitions', { preHandler: [authenticate] }, controller.recordAcquisition);

  app.get('/write-offs', { preHandler: [authenticate] }, controller.listWriteOffs);
  app.post('/write-offs', { preHandler: [authenticate] }, controller.recordWriteOff);
}
