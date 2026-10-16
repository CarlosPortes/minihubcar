import { FastifyInstance } from 'fastify';
import { WhatsAppController } from './whatsapp.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

export async function whatsappRoutes(app: FastifyInstance) {
  const controller = new WhatsAppController();

  app.get('/admin/whatsapp/status', { preHandler: [authenticate, requireAdmin] }, controller.getStatus);
  app.post('/admin/whatsapp/connect', { preHandler: [authenticate, requireAdmin] }, controller.getQRCode);
  app.post('/admin/whatsapp/disconnect', { preHandler: [authenticate, requireAdmin] }, controller.disconnect);
  app.post('/admin/whatsapp/test', { preHandler: [authenticate, requireAdmin] }, controller.sendTestMessage);
}
