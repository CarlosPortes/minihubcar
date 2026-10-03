import { eq, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import { catalogRequest, catalogRequestStatusHistory, appUser } from '../../database/schema';
import { CreateCatalogRequestInput, ReviewCatalogRequestInput } from './catalog-requests.schemas';

export class CatalogRequestsRepository {
  async listByUser(userId: string) {
    return db
      .select({
        id: catalogRequest.id,
        requestType: catalogRequest.requestType,
        proposedData: catalogRequest.proposedData,
        reason: catalogRequest.reason,
        status: catalogRequest.status,
        reviewedAt: catalogRequest.reviewedAt,
        createdAt: catalogRequest.createdAt,
      })
      .from(catalogRequest)
      .where(eq(catalogRequest.userId, userId))
      .orderBy(desc(catalogRequest.createdAt));
  }

  async listAllPending() {
    return db
      .select({
        id: catalogRequest.id,
        requestType: catalogRequest.requestType,
        proposedData: catalogRequest.proposedData,
        reason: catalogRequest.reason,
        status: catalogRequest.status,
        createdAt: catalogRequest.createdAt,
        user: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
        },
      })
      .from(catalogRequest)
      .innerJoin(appUser, eq(catalogRequest.userId, appUser.id))
      .where(eq(catalogRequest.status, 'PENDING'))
      .orderBy(desc(catalogRequest.createdAt));
  }

  async findById(id: string) {
    const rows = await db
      .select()
      .from(catalogRequest)
      .where(eq(catalogRequest.id, id))
      .limit(1);

    return rows[0] || null;
  }

  async create(userId: string, input: CreateCatalogRequestInput) {
    const [created] = await db
      .insert(catalogRequest)
      .values({
        userId,
        requestType: input.requestType,
        proposedData: input.proposedData,
        reason: input.reason || null,
        status: 'PENDING',
      })
      .returning();

    return created;
  }

  async review(id: string, reviewerId: string, input: ReviewCatalogRequestInput) {
    return db.transaction(async (tx) => {
      const [req] = await tx
        .select()
        .from(catalogRequest)
        .where(eq(catalogRequest.id, id))
        .limit(1);

      if (!req) {
        throw new Error('Solicitação não encontrada');
      }

      const oldStatus = req.status;

      const [updated] = await tx
        .update(catalogRequest)
        .set({
          status: input.status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        })
        .where(eq(catalogRequest.id, id))
        .returning();

      await tx.insert(catalogRequestStatusHistory).values({
        requestId: id,
        oldStatus,
        newStatus: input.status,
        changedBy: reviewerId,
        comment: input.comment || null,
      });

      return updated;
    });
  }
}
