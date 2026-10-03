import { FastifyInstance } from 'fastify';
import { MarketplaceController } from './marketplace.controller';

export async function marketplaceRoutes(app: FastifyInstance) {
  const controller = new MarketplaceController();

  // Public Marketplace Endpoints
  app.get('/marketplace/search', controller.search);
  app.get('/marketplace/variations/:variationId/offers', controller.getVariationOffers);
}
