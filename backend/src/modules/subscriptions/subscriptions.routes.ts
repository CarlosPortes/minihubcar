import { FastifyInstance } from 'fastify';
import { subscriptionsController } from './subscriptions.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

export async function subscriptionsRoutes(app: FastifyInstance) {
  // Public route to view plans
  app.get('/subscriptions/plans', subscriptionsController.listPlans);

  // Authenticated collector routes
  app.get('/subscriptions/me', { preHandler: [authenticate] }, subscriptionsController.getMySubscription);
  app.get('/subscriptions/limits', { preHandler: [authenticate] }, subscriptionsController.getMyLimits);
  app.post('/subscriptions/subscribe', { preHandler: [authenticate] }, subscriptionsController.subscribe);

  // Admin routes for subscription & billing management
  app.get('/admin/subscriptions/stats', { preHandler: [authenticate, requireAdmin] }, subscriptionsController.adminGetStats);
  app.get('/admin/subscriptions', { preHandler: [authenticate, requireAdmin] }, subscriptionsController.adminList);
  app.patch('/admin/subscriptions/:userId', { preHandler: [authenticate, requireAdmin] }, subscriptionsController.adminUpdate);
}
