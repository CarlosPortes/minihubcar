import { FastifyInstance } from 'fastify';
import { GarageController } from './garage.controller';
import { authenticate } from '../auth/auth.middleware';

export async function garageRoutes(app: FastifyInstance) {
  const controller = new GarageController();

  // 1. List all items in the user's garage (grouped by seller)
  app.get('/garage/mine', { preHandler: [authenticate] }, controller.listMyGarage);

  // 2. Cancel a purchased item in the garage (restores stock & reactivates offer)
  app.post('/garage/items/:orderItemId/cancel', { preHandler: [authenticate] }, controller.cancelGarageItem);

  // 3. Calculate shipping quote from seller to buyer
  app.post('/garage/shipping/quote', { preHandler: [authenticate] }, controller.calculateShippingQuote);

  // 4. Dispatch garage items
  app.post('/garage/dispatch', { preHandler: [authenticate] }, controller.dispatchGarage);
}
