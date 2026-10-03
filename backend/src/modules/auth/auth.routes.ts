import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { authenticate } from './auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController();

  app.post('/auth/register', controller.register);
  app.post('/auth/login', controller.login);
  app.post('/auth/refresh', controller.refresh);
  app.post('/auth/logout', controller.logout);
  app.get('/auth/me', { preHandler: [authenticate] }, controller.me);
  app.post('/auth/forgot-password', controller.forgotPassword);
  app.post('/auth/reset-password', controller.resetPassword);
}
