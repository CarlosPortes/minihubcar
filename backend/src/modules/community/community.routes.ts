import { FastifyInstance } from 'fastify';
import { CommunityController } from './community.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

export async function communityRoutes(app: FastifyInstance) {
  const controller = new CommunityController();

  // Rotas de fotos da coleção do próprio usuário (até 3 fotos com status)
  app.get('/users/profile/collection-photos', { preHandler: [authenticate] }, controller.getMyPhotos);
  app.post('/users/profile/collection-photos', { preHandler: [authenticate] }, controller.addMyPhoto);
  app.delete('/users/profile/collection-photos/:id', { preHandler: [authenticate] }, controller.deleteMyPhoto);

  // Moderação Administrativa de fotos enviadas
  app.get('/admin/collection-photos/pending', { preHandler: [authenticate, requireAdmin] }, controller.getPendingPhotos);
  app.get('/admin/collection-photos/history', { preHandler: [authenticate, requireAdmin] }, controller.getModerationHistory);
  app.patch('/admin/collection-photos/:id/moderate', { preHandler: [authenticate, requireAdmin] }, controller.moderatePhoto);

  // Vitrine pública da Comunidade
  app.get('/community/showcase', controller.getShowcase);
  app.get('/community/collectors/:userId', controller.getCollectorProfile);

  // Mensagens Diretas e Chat entre Colecionadores
  app.get('/community/conversations', { preHandler: [authenticate] }, controller.listConversations);
  app.get('/community/conversations/:conversationId/messages', { preHandler: [authenticate] }, controller.getMessages);
  app.post('/community/messages/:recipientUserId', { preHandler: [authenticate] }, controller.sendMessage);
  app.get('/community/messages/unread-count', { preHandler: [authenticate] }, controller.getUnreadCount);
}

