import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  collectionExemplar,
  variation,
  casting,
  miniatureBrand,
  automaker,
  wishlistItem,
  appUser,
} from '../../database/schema';

export class StatsRepository {
  async getTopWishlist(limit = 10) {
    return db
      .select({
        variationId: variation.id,
        variationName: variation.name,
        photoUrl: variation.photoUrl,
        releaseYear: variation.releaseYear,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        automakerName: automaker.name,
        count: sql<number>`count(${wishlistItem.id})::int`,
      })
      .from(wishlistItem)
      .innerJoin(variation, eq(wishlistItem.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(automaker, eq(casting.automakerId, automaker.id))
      .groupBy(
        variation.id,
        variation.name,
        variation.photoUrl,
        variation.releaseYear,
        casting.name,
        miniatureBrand.name,
        automaker.name
      )
      .orderBy(sql`count(${wishlistItem.id}) desc`)
      .limit(limit);
  }

  async getTopCollected(limit = 10) {
    return db
      .select({
        variationId: variation.id,
        variationName: variation.name,
        photoUrl: variation.photoUrl,
        releaseYear: variation.releaseYear,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        automakerName: automaker.name,
        count: sql<number>`count(${collectionExemplar.id})::int`,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(automaker, eq(casting.automakerId, automaker.id))
      .where(eq(collectionExemplar.status, 'ACTIVE'))
      .groupBy(
        variation.id,
        variation.name,
        variation.photoUrl,
        variation.releaseYear,
        casting.name,
        miniatureBrand.name,
        automaker.name
      )
      .orderBy(sql`count(${collectionExemplar.id}) desc`)
      .limit(limit);
  }

  async getTopCollectors(limit = 10) {
    return db
      .select({
        userId: appUser.id,
        name: appUser.name,
        avatarUrl: appUser.avatarUrl,
        count: sql<number>`count(${collectionExemplar.id})::int`,
        joinedAt: appUser.createdAt,
      })
      .from(collectionExemplar)
      .innerJoin(appUser, eq(collectionExemplar.userId, appUser.id))
      .where(eq(collectionExemplar.status, 'ACTIVE'))
      .groupBy(appUser.id, appUser.name, appUser.avatarUrl, appUser.createdAt)
      .orderBy(sql`count(${collectionExemplar.id}) desc`)
      .limit(limit);
  }

  async getTopBrands(limit = 6) {
    return db
      .select({
        brandName: miniatureBrand.name,
        count: sql<number>`count(${collectionExemplar.id})::int`,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(collectionExemplar.status, 'ACTIVE'))
      .groupBy(miniatureBrand.name)
      .orderBy(sql`count(${collectionExemplar.id}) desc`)
      .limit(limit);
  }

  async getOverview() {
    const [usersResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser);

    const [exemplarsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionExemplar)
      .where(eq(collectionExemplar.status, 'ACTIVE'));

    const [variationsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(variation)
      .where(eq(variation.status, 'ACTIVE'));

    const [wishlistResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wishlistItem);

    return {
      totalCollectors: usersResult?.count || 0,
      totalMiniaturesInCollections: exemplarsResult?.count || 0,
      totalCatalogModels: variationsResult?.count || 0,
      totalWishlistWishes: wishlistResult?.count || 0,
    };
  }
}
