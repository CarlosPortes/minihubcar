import { FastifyInstance } from 'fastify';
import { PreOrdersController } from './pre-orders.controller';
import { authenticate } from '../auth/auth.middleware';

export async function preOrdersRoutes(app: FastifyInstance) {
  const controller = new PreOrdersController();

  // Buyer endpoints
  app.post('/pre-orders/reserve', { preHandler: [authenticate] }, controller.reserve);
  app.get('/buyers/me/pre-orders', { preHandler: [authenticate] }, controller.listBuyerPreOrders);

  // Seller management endpoints
  app.get('/sellers/me/pre-orders/report', { preHandler: [authenticate] }, controller.getSellerPreOrdersReport);
  app.get('/sellers/me/pre-orders/dashboard', { preHandler: [authenticate] }, controller.getSellerPreOrdersDashboard);
  app.get('/sellers/me/pre-orders', { preHandler: [authenticate] }, controller.listSellerPreOrders);
  app.post(
    '/sellers/me/pre-orders/campaigns/:offerId/arrival',
    { preHandler: [authenticate] },
    controller.markCampaignArrival
  );
  app.patch(
    '/sellers/me/pre-orders/:preOrderId/fulfillment',
    { preHandler: [authenticate] },
    controller.updatePreOrderFulfillment
  );
  app.post(
    '/sellers/me/pre-orders/:preOrderId/installments/:installmentId/settle',
    { preHandler: [authenticate] },
    controller.settleInstallment
  );
  app.patch(
    '/sellers/me/pre-orders/:preOrderId/installments/:installmentId',
    { preHandler: [authenticate] },
    controller.updateInstallment
  );
  app.patch(
    '/sellers/me/pre-orders/:preOrderId/status',
    { preHandler: [authenticate] },
    controller.updatePreOrderStatus
  );
  app.post(
    '/sellers/me/pre-orders/:preOrderId/approve',
    { preHandler: [authenticate] },
    controller.approveReservation
  );
  app.post(
    '/sellers/me/pre-orders/:preOrderId/reject',
    { preHandler: [authenticate] },
    controller.rejectReservation
  );
  app.get(
    '/sellers/me/pre-orders/collectors',
    { preHandler: [authenticate] },
    controller.listCollectorsHealth
  );
  app.get(
    '/sellers/me/pre-orders/collectors/:collectorId/summary',
    { preHandler: [authenticate] },
    controller.getCollectorFinancialSummary
  );

  // Manual pre-order and batch import
  app.post(
    '/sellers/me/pre-orders/manual',
    { preHandler: [authenticate] },
    controller.createManualPreOrder
  );
  app.post(
    '/sellers/me/pre-orders/import',
    { preHandler: [authenticate] },
    controller.importPreOrdersBatch
  );
  app.get(
    '/sellers/me/pre-orders/import/template',
    { preHandler: [authenticate] },
    controller.downloadTemplateCsv
  );
}
