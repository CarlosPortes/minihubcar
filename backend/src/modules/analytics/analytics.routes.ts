import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

export async function analyticsRoutes(app: FastifyInstance) {
  const controller = new AnalyticsController();

  // Endpoint público para registrar navegação e acessos ao site
  app.post('/analytics/visit', controller.recordVisit);

  // Endpoint restrito para administradores consultarem métricas consolidadas
  app.get('/admin/analytics/stats', { preHandler: [authenticate, requireAdmin] }, controller.getAdminStats);
}
