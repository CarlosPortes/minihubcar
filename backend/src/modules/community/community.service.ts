import { eq, and, sql, desc, asc, ilike } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  appUser,
  userCollectionPhoto,
  collectionExemplar,
  variation,
  miniatureBrand,
  directConversation,
  directMessage,
} from '../../database/schema';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/api-error';

export interface AddPhotoInput {
  photoUrl: string;
  caption?: string;
}

export interface ModeratePhotoInput {
  action: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export class CommunityService {
  // Retorna as fotos da coleção cadastradas pelo próprio usuário (máximo 3)
  async getMyCollectionPhotos(userId: string) {
    const photos = await db
      .select({
        id: userCollectionPhoto.id,
        photoUrl: userCollectionPhoto.photoUrl,
        caption: userCollectionPhoto.caption,
        status: userCollectionPhoto.status,
        rejectionReason: userCollectionPhoto.rejectionReason,
        sortOrder: userCollectionPhoto.sortOrder,
        createdAt: userCollectionPhoto.createdAt,
      })
      .from(userCollectionPhoto)
      .where(eq(userCollectionPhoto.userId, userId))
      .orderBy(asc(userCollectionPhoto.sortOrder), asc(userCollectionPhoto.createdAt));

    return photos;
  }

  // Upload/cadastro de nova foto da coleção (limite máximo de 3)
  async addMyCollectionPhoto(userId: string, input: AddPhotoInput) {
    if (!input.photoUrl) {
      throw new BadRequestError('URL da foto é obrigatória');
    }

    const [existingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCollectionPhoto)
      .where(eq(userCollectionPhoto.userId, userId));

    const currentCount = existingCount?.count || 0;
    if (currentCount >= 3) {
      throw new BadRequestError('Limite máximo de 3 fotos da coleção atingido. Exclua uma foto anterior para enviar uma nova.');
    }

    const [created] = await db
      .insert(userCollectionPhoto)
      .values({
        userId,
        photoUrl: input.photoUrl,
        caption: input.caption?.trim() || null,
        status: 'PENDING',
        sortOrder: currentCount + 1,
      })
      .returning();

    return created;
  }

  // Exclusão de foto pelo próprio usuário
  async deleteMyCollectionPhoto(userId: string, photoId: string) {
    const [photo] = await db
      .select()
      .from(userCollectionPhoto)
      .where(and(eq(userCollectionPhoto.id, photoId), eq(userCollectionPhoto.userId, userId)))
      .limit(1);

    if (!photo) {
      throw new NotFoundError('Foto não encontrada ou não pertence ao seu perfil');
    }

    await db.delete(userCollectionPhoto).where(eq(userCollectionPhoto.id, photoId));
    return { success: true, message: 'Foto removida com sucesso' };
  }

  // Fila de fotos pendentes para moderação Admin
  async getPendingPhotosForAdmin() {
    const pending = await db
      .select({
        id: userCollectionPhoto.id,
        photoUrl: userCollectionPhoto.photoUrl,
        caption: userCollectionPhoto.caption,
        status: userCollectionPhoto.status,
        createdAt: userCollectionPhoto.createdAt,
        user: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          avatarUrl: appUser.avatarUrl,
          city: appUser.city,
          state: appUser.state,
        },
      })
      .from(userCollectionPhoto)
      .innerJoin(appUser, eq(userCollectionPhoto.userId, appUser.id))
      .where(eq(userCollectionPhoto.status, 'PENDING'))
      .orderBy(asc(userCollectionPhoto.createdAt));

    return pending;
  }

  // Histórico de fotos moderadas para Admin
  async getModerationHistoryForAdmin(limit = 50) {
    const history = await db
      .select({
        id: userCollectionPhoto.id,
        photoUrl: userCollectionPhoto.photoUrl,
        caption: userCollectionPhoto.caption,
        status: userCollectionPhoto.status,
        rejectionReason: userCollectionPhoto.rejectionReason,
        reviewedAt: userCollectionPhoto.reviewedAt,
        createdAt: userCollectionPhoto.createdAt,
        user: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          avatarUrl: appUser.avatarUrl,
        },
      })
      .from(userCollectionPhoto)
      .innerJoin(appUser, eq(userCollectionPhoto.userId, appUser.id))
      .where(sql`${userCollectionPhoto.status} != 'PENDING'`)
      .orderBy(desc(userCollectionPhoto.reviewedAt))
      .limit(limit);

    return history;
  }

  // Ação de moderação (Aprovar / Recusar)
  async moderatePhoto(adminId: string, photoId: string, input: ModeratePhotoInput) {
    const [existing] = await db
      .select()
      .from(userCollectionPhoto)
      .where(eq(userCollectionPhoto.id, photoId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Foto não encontrada para moderação');
    }

    const newStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const reason = input.action === 'REJECT' ? (input.rejectionReason?.trim() || 'Foto não atende às diretrizes da comunidade.') : null;

    const [updated] = await db
      .update(userCollectionPhoto)
      .set({
        status: newStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(userCollectionPhoto.id, photoId))
      .returning();

    return updated;
  }

  // Vitrine pública da Comunidade (lista colecionadores com isCollectionPublic = true)
  async getCommunityShowcase(search?: string, page = 1, limit = 24) {
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: appUser.id,
        name: appUser.name,
        avatarUrl: appUser.avatarUrl,
        city: appUser.city,
        state: appUser.state,
        createdAt: appUser.createdAt,
        totalItems: sql<number>`COALESCE(count(DISTINCT ${collectionExemplar.id}), 0)::int`,
      })
      .from(appUser)
      .leftJoin(
        collectionExemplar,
        and(
          eq(collectionExemplar.userId, appUser.id),
          eq(collectionExemplar.status, 'ACTIVE')
        )
      )
      .where(
        and(
          eq(appUser.isCollectionPublic, true),
          eq(appUser.status, 'ACTIVE'),
          search ? ilike(appUser.name, `%${search}%`) : undefined
        )
      )
      .groupBy(appUser.id)
      .having(sql`COALESCE(count(DISTINCT ${collectionExemplar.id}), 0) > 0`)
      .orderBy(desc(sql`COALESCE(count(DISTINCT ${collectionExemplar.id}), 0)`))
      .limit(limit)
      .offset(offset);

    const collectors = await query;

    // Para cada colecionador, busca fotos aprovadas
    const collectorIds = collectors.map((c) => c.id);
    let approvedPhotosMap: Record<string, Array<{ id: string; photoUrl: string; caption: string | null }>> = {};

    if (collectorIds.length > 0) {
      const photos = await db
        .select({
          id: userCollectionPhoto.id,
          userId: userCollectionPhoto.userId,
          photoUrl: userCollectionPhoto.photoUrl,
          caption: userCollectionPhoto.caption,
        })
        .from(userCollectionPhoto)
        .where(
          and(
            eq(userCollectionPhoto.status, 'APPROVED'),
            sql`${userCollectionPhoto.userId} IN ${collectorIds}`
          )
        )
        .orderBy(asc(userCollectionPhoto.sortOrder));

      for (const p of photos) {
        if (!approvedPhotosMap[p.userId]) {
          approvedPhotosMap[p.userId] = [];
        }
        approvedPhotosMap[p.userId]!.push({
          id: p.id,
          photoUrl: p.photoUrl,
          caption: p.caption,
        });
      }
    }

    const items = collectors.map((c) => ({
      ...c,
      approvedPhotos: approvedPhotosMap[c.id] || [],
    }));

    return {
      data: items,
      meta: {
        page,
        limit,
        count: items.length,
      },
    };
  }

  // Detalhe público de um colecionador
  async getPublicCollectorProfile(collectorId: string) {
    const [collector] = await db
      .select({
        id: appUser.id,
        name: appUser.name,
        avatarUrl: appUser.avatarUrl,
        city: appUser.city,
        state: appUser.state,
        instagram: appUser.instagram,
        website: appUser.website,
        isCollectionPublic: appUser.isCollectionPublic,
        createdAt: appUser.createdAt,
      })
      .from(appUser)
      .where(and(eq(appUser.id, collectorId), eq(appUser.status, 'ACTIVE')))
      .limit(1);

    if (!collector || !collector.isCollectionPublic) {
      throw new NotFoundError('Colecionador não encontrado ou perfil não é público');
    }

    // Fotos aprovadas da coleção
    const photos = await db
      .select({
        id: userCollectionPhoto.id,
        photoUrl: userCollectionPhoto.photoUrl,
        caption: userCollectionPhoto.caption,
      })
      .from(userCollectionPhoto)
      .where(and(eq(userCollectionPhoto.userId, collectorId), eq(userCollectionPhoto.status, 'APPROVED')))
      .orderBy(asc(userCollectionPhoto.sortOrder));

    // Resumo de contagem
    const [counts] = await db
      .select({
        totalExemplars: sql<number>`count(distinct ${collectionExemplar.id})::int`,
        totalCastings: sql<number>`count(distinct ${variation.castingId})::int`,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .where(and(eq(collectionExemplar.userId, collectorId), eq(collectionExemplar.status, 'ACTIVE')));

    return {
      collector,
      photos,
      stats: {
        totalExemplars: counts?.totalExemplars || 0,
        totalCastings: counts?.totalCastings || 0,
      },
    };
  }

  // --- MENSAGENS DIRETAS ENTRE COLECIONADORES ---

  async listUserConversations(userId: string) {
    const convs = await db
      .select({
        id: directConversation.id,
        user1Id: directConversation.user1Id,
        user2Id: directConversation.user2Id,
        lastMessageText: directConversation.lastMessageText,
        lastMessageAt: directConversation.lastMessageAt,
        createdAt: directConversation.createdAt,
      })
      .from(directConversation)
      .where(
        sql`${directConversation.user1Id} = ${userId} OR ${directConversation.user2Id} = ${userId}`
      )
      .orderBy(desc(directConversation.lastMessageAt));

    const results = [];

    for (const c of convs) {
      const partnerId = c.user1Id === userId ? c.user2Id : c.user1Id;
      const [partner] = await db
        .select({
          id: appUser.id,
          name: appUser.name,
          avatarUrl: appUser.avatarUrl,
          city: appUser.city,
          state: appUser.state,
        })
        .from(appUser)
        .where(eq(appUser.id, partnerId))
        .limit(1);

      // Count unread messages
      const [unreadRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(directMessage)
        .where(
          and(
            eq(directMessage.conversationId, c.id),
            sql`${directMessage.senderId} != ${userId}`,
            sql`${directMessage.readAt} IS NULL`
          )
        );

      results.push({
        id: c.id,
        partner: partner || { id: partnerId, name: 'Colecionador' },
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadRes?.count || 0,
      });
    }

    return results;
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const [conv] = await db
      .select()
      .from(directConversation)
      .where(eq(directConversation.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new NotFoundError('Conversa não encontrada');
    }

    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar esta conversa');
    }

    // Mark messages from the other user as read
    await db
      .update(directMessage)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessage.conversationId, conversationId),
          sql`${directMessage.senderId} != ${userId}`,
          sql`${directMessage.readAt} IS NULL`
        )
      );

    const messages = await db
      .select({
        id: directMessage.id,
        senderId: directMessage.senderId,
        content: directMessage.content,
        readAt: directMessage.readAt,
        createdAt: directMessage.createdAt,
      })
      .from(directMessage)
      .where(eq(directMessage.conversationId, conversationId))
      .orderBy(asc(directMessage.createdAt));

    const partnerId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
    const [partner] = await db
      .select({
        id: appUser.id,
        name: appUser.name,
        avatarUrl: appUser.avatarUrl,
        city: appUser.city,
        state: appUser.state,
      })
      .from(appUser)
      .where(eq(appUser.id, partnerId))
      .limit(1);

    return {
      conversationId,
      partner: partner || { id: partnerId, name: 'Colecionador' },
      messages,
    };
  }

  async sendDirectMessage(senderId: string, recipientUserId: string, content: string) {
    if (senderId === recipientUserId) {
      throw new BadRequestError('Você não pode enviar mensagens para si mesmo');
    }

    const [recipient] = await db
      .select({ id: appUser.id, name: appUser.name })
      .from(appUser)
      .where(eq(appUser.id, recipientUserId))
      .limit(1);

    if (!recipient) {
      throw new NotFoundError('Destinatário não encontrado');
    }

    // Find or create conversation
    let [conv] = await db
      .select()
      .from(directConversation)
      .where(
        sql`(${directConversation.user1Id} = ${senderId} AND ${directConversation.user2Id} = ${recipientUserId}) OR (${directConversation.user1Id} = ${recipientUserId} AND ${directConversation.user2Id} = ${senderId})`
      )
      .limit(1);

    if (!conv) {
      const [newConv] = await db
        .insert(directConversation)
        .values({
          user1Id: senderId,
          user2Id: recipientUserId,
          lastMessageText: content.trim(),
          lastMessageAt: new Date(),
        })
        .returning();
      conv = newConv!;
    } else {
      await db
        .update(directConversation)
        .set({
          lastMessageText: content.trim(),
          lastMessageAt: new Date(),
        })
        .where(eq(directConversation.id, conv.id));
    }

    const [msg] = await db
      .insert(directMessage)
      .values({
        conversationId: conv.id,
        senderId,
        content: content.trim(),
      })
      .returning();

    return {
      conversationId: conv.id,
      message: msg,
    };
  }

  async getUnreadCount(userId: string) {
    const [unreadRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(directMessage)
      .innerJoin(directConversation, eq(directMessage.conversationId, directConversation.id))
      .where(
        and(
          sql`(${directConversation.user1Id} = ${userId} OR ${directConversation.user2Id} = ${userId})`,
          sql`${directMessage.senderId} != ${userId}`,
          sql`${directMessage.readAt} IS NULL`
        )
      );

    return { unreadCount: unreadRes?.count || 0 };
  }
}

