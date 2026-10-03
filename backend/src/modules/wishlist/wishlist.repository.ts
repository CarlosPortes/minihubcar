import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  wishlistItem,
  variation,
  casting,
  miniatureBrand,
  collectionExemplar,
  scale,
} from '../../database/schema';
import { AddWishlistItemInput, UpdateWishlistItemInput } from './wishlist.schemas';

export class WishlistRepository {
  async listByUser(userId: string) {
    const items = await db
      .select({
        id: wishlistItem.id,
        priority: wishlistItem.priority,
        notes: wishlistItem.notes,
        createdAt: wishlistItem.createdAt,
        variation: {
          id: variation.id,
          name: variation.name,
          releaseYear: variation.releaseYear,
          color: variation.color,
          photoUrl: variation.photoUrl,
        },
        casting: {
          id: casting.id,
          name: casting.name,
        },
        brand: {
          id: miniatureBrand.id,
          name: miniatureBrand.name,
        },
        scale: {
          id: scale.id,
          name: scale.name,
        },
        ownedCount: sql<number>`(
          SELECT count(*)::int
          FROM ${collectionExemplar} ce
          WHERE ce.user_id = ${userId}
            AND ce.variation_id = ${variation.id}
            AND ce.status = 'ACTIVE'
        )`,
      })
      .from(wishlistItem)
      .innerJoin(variation, eq(wishlistItem.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(eq(wishlistItem.userId, userId))
      .orderBy(desc(wishlistItem.priority), desc(wishlistItem.createdAt));

    return items.map((item) => ({
      ...item,
      isOwned: item.ownedCount > 0,
    }));
  }

  async findByUserAndVariation(userId: string, variationId: string) {
    const rows = await db
      .select()
      .from(wishlistItem)
      .where(
        and(eq(wishlistItem.userId, userId), eq(wishlistItem.variationId, variationId))
      )
      .limit(1);

    return rows[0] || null;
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select()
      .from(wishlistItem)
      .where(and(eq(wishlistItem.id, id), eq(wishlistItem.userId, userId)))
      .limit(1);

    return rows[0] || null;
  }

  async add(userId: string, input: AddWishlistItemInput) {
    const [created] = await db
      .insert(wishlistItem)
      .values({
        userId,
        variationId: input.variationId,
        priority: input.priority,
        notes: input.notes || null,
      })
      .returning();

    return created;
  }

  async update(id: string, userId: string, input: UpdateWishlistItemInput) {
    const values: any = {};
    if (input.priority !== undefined) {
      values.priority = input.priority;
    }
    if (input.notes !== undefined) {
      values.notes = input.notes;
    }

    const [updated] = await db
      .update(wishlistItem)
      .set(values)
      .where(and(eq(wishlistItem.id, id), eq(wishlistItem.userId, userId)))
      .returning();

    return updated;
  }

  async remove(id: string, userId: string) {
    const [deleted] = await db
      .delete(wishlistItem)
      .where(and(eq(wishlistItem.id, id), eq(wishlistItem.userId, userId)))
      .returning();

    return deleted;
  }
}
