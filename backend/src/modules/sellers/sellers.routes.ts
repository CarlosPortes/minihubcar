import { FastifyInstance } from 'fastify';
import { SellersController } from './sellers.controller';
import { authenticate } from '../auth/auth.middleware';

export async function sellersRoutes(app: FastifyInstance) {
  const controller = new SellersController();

  // Public: get seller profile by slug
  app.get('/sellers/:slug', controller.getBySlug);

  // Authenticated seller endpoints
  app.post('/sellers/apply', { preHandler: [authenticate] }, controller.apply);
  app.get('/sellers/me', { preHandler: [authenticate] }, controller.getMe);
  app.patch('/sellers/me', { preHandler: [authenticate] }, controller.updateMe);
  app.get('/sellers/me/finance/report', { preHandler: [authenticate] }, controller.getFinancialReport);

  // Seller dispatch addresses (origins)
  app.get('/sellers/me/addresses', { preHandler: [authenticate] }, controller.listAddresses);
  app.post('/sellers/me/addresses', { preHandler: [authenticate] }, controller.createAddress);
  app.patch('/sellers/me/addresses/:addressId', { preHandler: [authenticate] }, controller.updateAddress);
  app.delete('/sellers/me/addresses/:addressId', { preHandler: [authenticate] }, controller.deleteAddress);

  // Seller shipping integrations (BYOK: SuperFrete, Frete Rápido, Melhor Envio)
  app.get('/sellers/me/shipping-integrations', { preHandler: [authenticate] }, controller.listShippingIntegrations);
  app.put('/sellers/me/shipping-integrations/:provider', { preHandler: [authenticate] }, controller.saveShippingIntegration);
  app.delete('/sellers/me/shipping-integrations/:provider', { preHandler: [authenticate] }, controller.deleteShippingIntegration);

  // Admin moderation endpoints
  app.get('/admin/sellers', { preHandler: [authenticate] }, controller.listAdminApplications);
  app.patch('/admin/sellers/:id/review', { preHandler: [authenticate] }, controller.review);

  // Seller Quick Miniature Creation (Pre-Orders / Offers)
  app.post('/sellers/catalog/quick-create', { preHandler: [authenticate] }, controller.quickCreateVariation);
}

