import { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

export async function usersRoutes(app: FastifyInstance) {
  const controller = new UsersController();

  // User Self Profile
  app.get('/users/me', { preHandler: [authenticate] }, controller.getProfile);
  app.patch('/users/me', { preHandler: [authenticate] }, controller.updateProfile);
  app.patch('/users/me/email', { preHandler: [authenticate] }, controller.updateEmail);
  app.patch('/users/me/password', { preHandler: [authenticate] }, controller.updatePassword);

  // Admin Management Endpoints
  app.get('/admin/users/stats', { preHandler: [authenticate, requireAdmin] }, controller.adminGetStats);
  app.get('/admin/users', { preHandler: [authenticate, requireAdmin] }, controller.adminListUsers);
  app.patch('/admin/users/:id/status', { preHandler: [authenticate, requireAdmin] }, controller.adminUpdateStatus);
  app.post('/admin/users/:id/reset-password', { preHandler: [authenticate, requireAdmin] }, controller.adminResetPassword);
  app.patch('/admin/users/:id/roles', { preHandler: [authenticate, requireAdmin] }, controller.adminUpdateRoles);
}

