import { FastifyInstance } from 'fastify';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../auth/auth.middleware';

export async function dashboardRoutes(app: FastifyInstance) {
  const controller = new DashboardController();

  app.get('/dashboard', { preHandler: [authenticate] }, controller.getSummary);
}
