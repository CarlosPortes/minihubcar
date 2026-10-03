import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  collectionExemplar,
  variation,
  miniatureBrand,
  casting,
  scale,
  location,
  exemplarLocation,
  acquisition,
  acquisitionItem,
  sale,
  saleItem,
  wishlistItem,
  catalogRequest,
} from '../../database/schema';

export class DashboardRepository {
  async getMetrics(userId: string) {
    // 1. Active exemplars count
    const [activeResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')));

    // 2. Distinct variations count
    const [distinctResult] = await db
      .select({ count: sql<number>`count(distinct ${collectionExemplar.variationId})::int` })
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')));

    // 3. Total invested value
    const [investedResult] = await db
      .select({ total: sql<string>`coalesce(sum(${acquisitionItem.totalCost}), 0)` })
      .from(acquisitionItem)
      .innerJoin(acquisition, eq(acquisitionItem.acquisitionId, acquisition.id))
      .where(eq(acquisition.userId, userId));

    // 4. Sold exemplars count
    const [soldCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'SOLD')));

    // 5. Total sales value
    const [salesValueResult] = await db
      .select({ total: sql<string>`coalesce(sum(${saleItem.totalPrice}), 0)` })
      .from(saleItem)
      .innerJoin(sale, eq(saleItem.saleId, sale.id))
      .where(eq(sale.userId, userId));

    // 6. Wishlist count
    const [wishlistResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wishlistItem)
      .where(eq(wishlistItem.userId, userId));

    // 7. Pending catalog requests
    const [pendingRequestsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(catalogRequest)
      .where(and(eq(catalogRequest.userId, userId), eq(catalogRequest.status, 'PENDING')));

    const totalInvested = parseFloat(investedResult?.total || '0');
    const totalSales = parseFloat(salesValueResult?.total || '0');
    const patrimonialResult = totalSales - totalInvested;

    return {
      activeExemplars: activeResult?.count || 0,
      distinctVariations: distinctResult?.count || 0,
      totalInvested,
      soldExemplars: soldCountResult?.count || 0,
      totalSales,
      patrimonialResult,
      wishlistCount: wishlistResult?.count || 0,
      pendingRequests: pendingRequestsResult?.count || 0,
    };
  }

  async getDistributions(userId: string) {
    // Distribution by brand
    const byBrand = await db
      .select({
        name: miniatureBrand.name,
        count: sql<number>`count(*)::int`,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')))
      .groupBy(miniatureBrand.name)
      .orderBy(sql`count(*) desc`)
      .limit(6);

    // Distribution by scale
    const byScale = await db
      .select({
        name: sql<string>`coalesce(${scale.name}, 'Outra')`,
        count: sql<number>`count(*)::int`,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')))
      .groupBy(scale.name)
      .orderBy(sql`count(*) desc`);

    // Distribution by location
    const byLocation = await db
      .select({
        name: sql<string>`coalesce(${location.name}, 'Sem Localização')`,
        count: sql<number>`count(*)::int`,
      })
      .from(collectionExemplar)
      .leftJoin(
        exemplarLocation,
        and(
          eq(exemplarLocation.exemplarId, collectionExemplar.id),
          eq(exemplarLocation.isCurrent, true)
        )
      )
      .leftJoin(location, eq(exemplarLocation.locationId, location.id))
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')))
      .groupBy(location.name)
      .orderBy(sql`count(*) desc`)
      .limit(6);

    return {
      byBrand,
      byScale,
      byLocation,
    };
  }

  async getRecentActivities(userId: string) {
    // Recent added exemplars
    const recentExemplars = await db
      .select({
        id: collectionExemplar.id,
        name: variation.name,
        brand: miniatureBrand.name,
        photoUrl: variation.photoUrl,
        createdAt: collectionExemplar.createdAt,
      })
      .from(collectionExemplar)
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(collectionExemplar.userId, userId))
      .orderBy(desc(collectionExemplar.createdAt))
      .limit(5);

    return {
      recentExemplars,
    };
  }
}
