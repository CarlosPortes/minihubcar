import { FastifyReply, FastifyRequest } from 'fastify';
import { CommunityService } from './community.service';
import { BadRequestError } from '../../shared/errors/api-error';

const communityService = new CommunityService();

export class CommunityController {
  getMyPhotos = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const photos = await communityService.getMyCollectionPhotos(user.sub);
    return reply.status(200).send({ data: photos });
  };

  addMyPhoto = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const body = request.body as { photoUrl?: string; caption?: string };

    if (!body?.photoUrl) {
      throw new BadRequestError('photoUrl é obrigatório');
    }

    const created = await communityService.addMyCollectionPhoto(user.sub, {
      photoUrl: body.photoUrl,
      caption: body.caption,
    });

    return reply.status(201).send({ data: created });
  };

  deleteMyPhoto = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };

    const res = await communityService.deleteMyCollectionPhoto(user.sub, id);
    return reply.status(200).send(res);
  };

  getPendingPhotos = async (_request: FastifyRequest, reply: FastifyReply) => {
    const pending = await communityService.getPendingPhotosForAdmin();
    return reply.status(200).send({ data: pending });
  };

  getModerationHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const history = await communityService.getModerationHistoryForAdmin(limit);
    return reply.status(200).send({ data: history });
  };

  moderatePhoto = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const body = request.body as { action: 'APPROVE' | 'REJECT'; rejectionReason?: string };

    if (!body || !['APPROVE', 'REJECT'].includes(body.action)) {
      throw new BadRequestError("Ação inválida. Deve ser 'APPROVE' ou 'REJECT'");
    }

    const updated = await communityService.moderatePhoto(user.sub, id, body);
    return reply.status(200).send({ data: updated });
  };

  getShowcase = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { search?: string; page?: string; limit?: string; sort?: string };
    const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
    const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 24;
    const sort = query.sort === 'items' ? 'items' : 'recent';

    const showcase = await communityService.getCommunityShowcase(query.search, page, limit, sort);
    return reply.status(200).send(showcase);
  };

  getCollectorProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const profile = await communityService.getPublicCollectorProfile(userId);
    return reply.status(200).send({ data: profile });
  };

  // --- Chat & Mensagens ---

  listConversations = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const convs = await communityService.listUserConversations(user.sub);
    return reply.status(200).send({ data: convs });
  };

  getMessages = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { conversationId } = request.params as { conversationId: string };
    const result = await communityService.getConversationMessages(user.sub, conversationId);
    return reply.status(200).send({ data: result });
  };

  sendMessage = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { recipientUserId } = request.params as { recipientUserId: string };
    const body = request.body as { content?: string };

    if (!body?.content || !body.content.trim()) {
      throw new BadRequestError('Conteúdo da mensagem é obrigatório');
    }

    const result = await communityService.sendDirectMessage(user.sub, recipientUserId, body.content);
    return reply.status(201).send({ data: result });
  };

  getUnreadCount = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const count = await communityService.getUnreadCount(user.sub);
    return reply.status(200).send({ data: count });
  };

  sendRetroactiveWelcome = async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await communityService.sendRetroactiveWelcomeMessages();
    return reply.status(200).send({ data: result });
  };
}

