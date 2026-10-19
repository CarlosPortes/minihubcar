import { eq, and, ne, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  collectionExemplar,
  wishlistItem,
  variation,
  miniatureBrand,
  casting,
  appUser,
  tradeProposal,
} from '../../database/schema';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/api-error';
import { CreateTradeProposalInput, ToggleTradeInput, UpdateProposalStatusInput } from './trades.schemas';

export class TradesService {
  /**
   * Encontra todas as oportunidades de match de trocas para o colecionador
   */
  async findMatches(userId: string) {
    // 1. Double Match (Match Perfeito / Troca Mútua)
    // Eu tenho algo da Wishlist de B (marcado para troca) E B tem algo da minha Wishlist (marcado para troca)
    const doubleMatchesRows = await db.execute(sql`
      SELECT 
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.username AS other_user_username,
        u.avatar_url AS other_user_avatar_url,
        u.city AS other_user_city,
        u.state AS other_user_state,
        u.whatsapp AS other_user_whatsapp,
        
        my_ce.id AS my_offered_exemplar_id,
        my_v.id AS my_offered_variation_id,
        my_v.name AS my_offered_variation_name,
        my_v.photo_url AS my_offered_photo_url,
        my_b.name AS my_offered_brand_name,
        
        other_ce.id AS other_offered_exemplar_id,
        other_v.id AS other_offered_variation_id,
        other_v.name AS other_offered_variation_name,
        other_v.photo_url AS other_offered_photo_url,
        other_b.name AS other_offered_brand_name
      FROM collection_exemplar my_ce
      JOIN variation my_v ON my_ce.variation_id = my_v.id
      JOIN casting my_c ON my_v.casting_id = my_c.id
      JOIN miniature_brand my_b ON my_c.miniature_brand_id = my_b.id
      -- O outro usuário tem minha miniatura na wishlist dele:
      JOIN wishlist_item other_wi ON other_wi.variation_id = my_v.id AND other_wi.user_id != ${userId}::uuid
      JOIN app_user u ON other_wi.user_id = u.id AND u.status = 'ACTIVE'
      -- E esse outro usuário tem uma miniatura para troca:
      JOIN collection_exemplar other_ce ON other_ce.user_id = u.id AND other_ce.is_for_trade = TRUE AND other_ce.status = 'ACTIVE'
      JOIN variation other_v ON other_ce.variation_id = other_v.id
      JOIN casting other_c ON other_v.casting_id = other_c.id
      JOIN miniature_brand other_b ON other_c.miniature_brand_id = other_b.id
      -- E essa miniatura está na minha wishlist:
      JOIN wishlist_item my_wi ON my_wi.variation_id = other_v.id AND my_wi.user_id = ${userId}::uuid
      WHERE my_ce.user_id = ${userId}::uuid
        AND my_ce.is_for_trade = TRUE
        AND my_ce.status = 'ACTIVE'
      LIMIT 50;
    `);

    // 2. Oportunidades: Outros querem o que você tem para troca
    const theyWantRows = await db.execute(sql`
      SELECT 
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.username AS other_user_username,
        u.avatar_url AS other_user_avatar_url,
        u.city AS other_user_city,
        u.state AS other_user_state,
        u.whatsapp AS other_user_whatsapp,
        
        my_ce.id AS my_exemplar_id,
        my_v.id AS variation_id,
        my_v.name AS variation_name,
        my_v.photo_url AS photo_url,
        my_b.name AS brand_name,
        wi.priority AS wishlist_priority
      FROM collection_exemplar my_ce
      JOIN variation my_v ON my_ce.variation_id = my_v.id
      JOIN casting my_c ON my_v.casting_id = my_c.id
      JOIN miniature_brand my_b ON my_c.miniature_brand_id = my_b.id
      JOIN wishlist_item wi ON wi.variation_id = my_v.id AND wi.user_id != ${userId}::uuid
      JOIN app_user u ON wi.user_id = u.id AND u.status = 'ACTIVE'
      WHERE my_ce.user_id = ${userId}::uuid
        AND my_ce.is_for_trade = TRUE
        AND my_ce.status = 'ACTIVE'
      ORDER BY wi.priority DESC, wi.created_at DESC
      LIMIT 50;
    `);

    // 3. Oportunidades: Outros têm miniaturas da sua Wishlist para troca
    const theyHaveRows = await db.execute(sql`
      SELECT 
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.username AS other_user_username,
        u.avatar_url AS other_user_avatar_url,
        u.city AS other_user_city,
        u.state AS other_user_state,
        u.whatsapp AS other_user_whatsapp,
        
        ce.id AS other_exemplar_id,
        v.id AS variation_id,
        v.name AS variation_name,
        v.photo_url AS photo_url,
        b.name AS brand_name,
        my_wi.priority AS my_priority
      FROM wishlist_item my_wi
      JOIN variation v ON my_wi.variation_id = v.id
      JOIN casting c ON v.casting_id = c.id
      JOIN miniature_brand b ON c.miniature_brand_id = b.id
      JOIN collection_exemplar ce ON ce.variation_id = v.id AND ce.is_for_trade = TRUE AND ce.status = 'ACTIVE' AND ce.user_id != ${userId}::uuid
      JOIN app_user u ON ce.user_id = u.id AND u.status = 'ACTIVE'
      WHERE my_wi.user_id = ${userId}::uuid
      ORDER BY my_wi.priority DESC, ce.created_at DESC
      LIMIT 50;
    `);

    return {
      doubleMatches: Array.from(doubleMatchesRows as any[]),
      theyWant: Array.from(theyWantRows as any[]),
      theyHave: Array.from(theyHaveRows as any[]),
      summary: {
        doubleMatchesCount: (doubleMatchesRows as any[]).length,
        theyWantCount: (theyWantRows as any[]).length,
        theyHaveCount: (theyHaveRows as any[]).length,
      },
    };
  }

  /**
   * Altera status de disponibilidade para troca de um exemplar
   */
  async toggleTrade(userId: string, input: ToggleTradeInput) {
    const [exemplar] = await db
      .select()
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.id, input.exemplarId), eq(collectionExemplar.userId, userId)))
      .limit(1);

    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção.');
    }

    const [updated] = await db
      .update(collectionExemplar)
      .set({
        isForTrade: input.isForTrade,
        updatedAt: new Date(),
      })
      .where(eq(collectionExemplar.id, input.exemplarId))
      .returning();

    return updated;
  }

  /**
   * Lista miniaturas do usuário marcadas para troca
   */
  async getMyTradeExemplars(userId: string) {
    const rows = await db
      .select({
        exemplarId: collectionExemplar.id,
        variationId: variation.id,
        name: variation.name,
        releaseYear: variation.releaseYear,
        brandName: miniatureBrand.name,
        photoUrl: variation.photoUrl,
        isForTrade: collectionExemplar.isForTrade,
        notes: collectionExemplar.notes,
        createdAt: collectionExemplar.createdAt,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')))
      .orderBy(desc(collectionExemplar.isForTrade), desc(collectionExemplar.createdAt));

    return rows;
  }

  /**
   * Cria uma proposta de troca entre colecionadores
   */
  async createProposal(requesterId: string, input: CreateTradeProposalInput) {
    if (requesterId === input.receiverId) {
      throw new BadRequestError('Você não pode propor uma troca com você mesmo.');
    }

    // Verifica exemplar oferecido
    const [offered] = await db
      .select()
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.id, input.offeredExemplarId), eq(collectionExemplar.userId, requesterId)))
      .limit(1);

    if (!offered) {
      throw new NotFoundError('Exemplar oferecido não pertence à sua coleção.');
    }

    const [created] = await db
      .insert(tradeProposal)
      .values({
        requesterId,
        receiverId: input.receiverId,
        offeredExemplarId: input.offeredExemplarId,
        requestedExemplarId: input.requestedExemplarId || null,
        message: input.message ? input.message.trim() : null,
        status: 'PENDING',
      })
      .returning();

    return created;
  }

  /**
   * Lista propostas recebidas e enviadas pelo colecionador
   */
  async listProposals(userId: string) {
    const incomingRows = await db.execute(sql`
      SELECT 
        tp.id,
        tp.status,
        tp.message,
        tp.created_at,
        tp.updated_at,
        
        req.id AS requester_id,
        req.name AS requester_name,
        req.username AS requester_username,
        req.avatar_url AS requester_avatar_url,
        req.whatsapp AS requester_whatsapp,
        req.city AS requester_city,
        req.state AS requester_state,
        
        off_v.id AS offered_variation_id,
        off_v.name AS offered_variation_name,
        off_v.photo_url AS offered_photo_url,
        off_b.name AS offered_brand_name,
        
        req_v.id AS requested_variation_id,
        req_v.name AS requested_variation_name,
        req_v.photo_url AS requested_photo_url,
        req_b.name AS requested_brand_name
      FROM trade_proposal tp
      JOIN app_user req ON tp.requester_id = req.id
      JOIN collection_exemplar off_ce ON tp.offered_exemplar_id = off_ce.id
      JOIN variation off_v ON off_ce.variation_id = off_v.id
      JOIN casting off_c ON off_v.casting_id = off_c.id
      JOIN miniature_brand off_b ON off_c.miniature_brand_id = off_b.id
      LEFT JOIN collection_exemplar req_ce ON tp.requested_exemplar_id = req_ce.id
      LEFT JOIN variation req_v ON req_ce.variation_id = req_v.id
      LEFT JOIN casting req_c ON req_v.casting_id = req_c.id
      LEFT JOIN miniature_brand req_b ON req_c.miniature_brand_id = req_b.id
      WHERE tp.receiver_id = ${userId}::uuid
      ORDER BY tp.created_at DESC;
    `);

    const outgoingRows = await db.execute(sql`
      SELECT 
        tp.id,
        tp.status,
        tp.message,
        tp.created_at,
        tp.updated_at,
        
        rec.id AS receiver_id,
        rec.name AS receiver_name,
        rec.username AS receiver_username,
        rec.avatar_url AS receiver_avatar_url,
        rec.whatsapp AS receiver_whatsapp,
        rec.city AS receiver_city,
        rec.state AS receiver_state,
        
        off_v.id AS offered_variation_id,
        off_v.name AS offered_variation_name,
        off_v.photo_url AS offered_photo_url,
        off_b.name AS offered_brand_name,
        
        req_v.id AS requested_variation_id,
        req_v.name AS requested_variation_name,
        req_v.photo_url AS requested_photo_url,
        req_b.name AS requested_brand_name
      FROM trade_proposal tp
      JOIN app_user rec ON tp.receiver_id = rec.id
      JOIN collection_exemplar off_ce ON tp.offered_exemplar_id = off_ce.id
      JOIN variation off_v ON off_ce.variation_id = off_v.id
      JOIN casting off_c ON off_v.casting_id = off_c.id
      JOIN miniature_brand off_b ON off_c.miniature_brand_id = off_b.id
      LEFT JOIN collection_exemplar req_ce ON tp.requested_exemplar_id = req_ce.id
      LEFT JOIN variation req_v ON req_ce.variation_id = req_v.id
      LEFT JOIN casting req_c ON req_v.casting_id = req_c.id
      LEFT JOIN miniature_brand req_b ON req_c.miniature_brand_id = req_b.id
      WHERE tp.requester_id = ${userId}::uuid
      ORDER BY tp.created_at DESC;
    `);

    return {
      incoming: Array.from(incomingRows as any[]),
      outgoing: Array.from(outgoingRows as any[]),
    };
  }

  /**
   * Atualiza status de proposta (Aceitar, Recusar, Cancelar)
   */
  async updateProposalStatus(userId: string, proposalId: string, input: UpdateProposalStatusInput) {
    const [proposal] = await db
      .select()
      .from(tradeProposal)
      .where(eq(tradeProposal.id, proposalId))
      .limit(1);

    if (!proposal) {
      throw new NotFoundError('Proposta de troca não encontrada.');
    }

    if (input.status === 'CANCELLED' && proposal.requesterId !== userId) {
      throw new ForbiddenError('Apenas o proponente pode cancelar a proposta.');
    }

    if ((input.status === 'ACCEPTED' || input.status === 'DECLINED') && proposal.receiverId !== userId) {
      throw new ForbiddenError('Apenas o destinatário pode aceitar ou recusar a proposta.');
    }

    const [updated] = await db
      .update(tradeProposal)
      .set({
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(tradeProposal.id, proposalId))
      .returning();

    return updated;
  }
}
