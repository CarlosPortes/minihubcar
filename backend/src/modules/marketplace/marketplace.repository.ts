import { eq, and, sql, ilike, gte, lte, asc, or, count, min, max } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  variation,
  casting,
  miniatureBrand,
  scale,
  automaker,
  vehicleModel,
  castingVehicle,
  commercialProduct,
  offer,
  commercialInventory,
  sellerProfile,
  sellerAuthorization,
} from '../../database/schema';
import { MarketplaceSearchQuery } from './marketplace.schemas';

export class MarketplaceRepository {
  async searchMarketplace(query: MarketplaceSearchQuery) {
    const { q, brandId, scaleId, minPrice, maxPrice, page, pageSize } = query;
    const offset = (page - 1) * pageSize;

    // Conditions for active purchasable offers
    const conditions = [
      eq(commercialProduct.isActive, true),
      eq(offer.status, 'ACTIVE'),
      eq(sellerProfile.isActive, true),
      eq(sellerAuthorization.status, 'APPROVED'),
      sql`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed}) > 0`,
    ];

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(variation.name, term),
          ilike(casting.name, term),
          ilike(miniatureBrand.name, term)
        )!
      );
    }

    if (brandId) {
      conditions.push(eq(casting.miniatureBrandId, brandId));
    }

    if (scaleId) {
      conditions.push(eq(variation.scaleId, scaleId));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(offer.price, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(offer.price, maxPrice.toString()));
    }

    // Query distinct variations with min/max price and offer counts
    const rows = await db
      .select({
        variationId: variation.id,
        variationName: variation.name,
        photoUrl: variation.photoUrl,
        releaseYear: variation.releaseYear,
        color: variation.color,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        scaleName: scale.name,
        minPrice: min(offer.price),
        maxPrice: max(offer.price),
        offersCount: count(offer.id),
        totalAvailable: sql<number>`sum(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
      })
      .from(commercialProduct)
      .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .innerJoin(offer, eq(commercialProduct.id, offer.commercialProductId))
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
      .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
      .where(and(...conditions))
      .groupBy(
        variation.id,
        variation.name,
        variation.photoUrl,
        variation.releaseYear,
        variation.color,
        casting.name,
        miniatureBrand.name,
        scale.name
      )
      .orderBy(asc(min(offer.price)))
      .limit(pageSize)
      .offset(offset);

    // Total count for pagination
    const totalCountQuery = await db
      .select({
        total: sql<number>`count(distinct ${variation.id})::int`,
      })
      .from(commercialProduct)
      .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(offer, eq(commercialProduct.id, offer.commercialProductId))
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
      .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
      .where(and(...conditions));

    const total = totalCountQuery[0]?.total || 0;

    return {
      items: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async getVariationOffers(variationId: string) {
    // 1. Get canonical variation details
    const [varRow] = await db
      .select({
        id: variation.id,
        name: variation.name,
        photoUrl: variation.photoUrl,
        releaseYear: variation.releaseYear,
        color: variation.color,
        finish: variation.finish,
        lineType: variation.lineType,
        rarity: variation.rarity,
        description: variation.description,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        scaleName: scale.name,
      })
      .from(variation)
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(eq(variation.id, variationId))
      .limit(1);

    if (!varRow) return null;

    // 2. Get active offers from approved sellers for this variation
    const offers = await db
      .select({
        id: offer.id,
        title: offer.title,
        price: offer.price,
        condition: offer.condition,
        packagingState: offer.packagingState,
        description: offer.description,
        photos: offer.photos,
        isPreOrder: offer.isPreOrder,
        preOrderEstimatedArrival: offer.preOrderEstimatedArrival,
        allowDepositAndBalance: offer.allowDepositAndBalance,
        depositAmount: offer.depositAmount,
        allowFullOnArrival: offer.allowFullOnArrival,
        allowInstallments: offer.allowInstallments,
        maxInstallments: offer.maxInstallments,
        createdAt: offer.createdAt,
        availableStock: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
        inventory: {
          available: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
          onHand: commercialInventory.onHand,
        },
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
          reputationScore: sellerProfile.reputationScore,
          totalSalesCount: sellerProfile.totalSalesCount,
        },
      })
      .from(commercialProduct)
      .innerJoin(offer, eq(commercialProduct.id, offer.commercialProductId))
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
      .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
      .where(
        and(
          eq(commercialProduct.variationId, variationId),
          eq(commercialProduct.isActive, true),
          eq(offer.status, 'ACTIVE'),
          eq(sellerProfile.isActive, true),
          eq(sellerAuthorization.status, 'APPROVED'),
          sql`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed}) > 0`
        )
      )
      .orderBy(asc(offer.price));

    return {
      variation: varRow,
      offers,
    };
  }
}
