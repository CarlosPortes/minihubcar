import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  commercialProduct,
  offer,
  offerPriceHistory,
  commercialInventory,
  inventoryMovement,
  variation,
  casting,
  miniatureBrand,
  sellerProfile,
} from '../../database/schema';
import { CreateOfferInput, UpdateOfferInput, AdjustStockInput } from './offers.schemas';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class OffersRepository {
  async findSellerProfileByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(sellerProfile)
      .where(eq(sellerProfile.userId, userId))
      .limit(1);
    return profile || null;
  }

  async listSellerOffers(sellerId: string) {
    const rows = await db
      .select({
        id: offer.id,
        title: offer.title,
        price: offer.price,
        condition: offer.condition,
        packagingState: offer.packagingState,
        description: offer.description,
        status: offer.status,
        photos: offer.photos,
        isPreOrder: offer.isPreOrder,
        preOrderEstimatedArrival: offer.preOrderEstimatedArrival,
        allowDepositAndBalance: offer.allowDepositAndBalance,
        depositAmount: offer.depositAmount,
        allowFullOnArrival: offer.allowFullOnArrival,
        allowInstallments: offer.allowInstallments,
        maxInstallments: offer.maxInstallments,
        packageWeightGrams: offer.packageWeightGrams,
        shippingAddressId: offer.shippingAddressId,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        inventory: {
          id: commercialInventory.id,
          onHand: commercialInventory.onHand,
          reserved: commercialInventory.reserved,
          committed: commercialInventory.committed,
        },
        variation: {
          id: variation.id,
          name: variation.name,
          releaseYear: variation.releaseYear,
          photoUrl: variation.photoUrl,
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
      })
      .from(offer)
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(commercialProduct, eq(offer.commercialProductId, commercialProduct.id))
      .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(offer.sellerId, sellerId))
      .orderBy(desc(offer.createdAt));

    return rows.map((r) => ({
      ...r,
      inventory: {
        ...r.inventory,
        available: Math.max(0, r.inventory.onHand - r.inventory.reserved - r.inventory.committed),
      },
    }));
  }

  async findById(offerId: string) {
    const [row] = await db
      .select({
        id: offer.id,
        sellerId: offer.sellerId,
        commercialProductId: offer.commercialProductId,
        title: offer.title,
        price: offer.price,
        condition: offer.condition,
        packagingState: offer.packagingState,
        description: offer.description,
        status: offer.status,
        photos: offer.photos,
        isPreOrder: offer.isPreOrder,
        preOrderEstimatedArrival: offer.preOrderEstimatedArrival,
        allowDepositAndBalance: offer.allowDepositAndBalance,
        depositAmount: offer.depositAmount,
        allowFullOnArrival: offer.allowFullOnArrival,
        allowInstallments: offer.allowInstallments,
        maxInstallments: offer.maxInstallments,
        packageWeightGrams: offer.packageWeightGrams,
        shippingAddressId: offer.shippingAddressId,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        inventory: {
          id: commercialInventory.id,
          onHand: commercialInventory.onHand,
          reserved: commercialInventory.reserved,
          committed: commercialInventory.committed,
        },
        variation: {
          id: variation.id,
          name: variation.name,
          photoUrl: variation.photoUrl,
          releaseYear: variation.releaseYear,
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
          reputationScore: sellerProfile.reputationScore,
        },
      })
      .from(offer)
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(commercialProduct, eq(offer.commercialProductId, commercialProduct.id))
      .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
      .where(eq(offer.id, offerId))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      inventory: {
        ...row.inventory,
        available: Math.max(0, row.inventory.onHand - row.inventory.reserved - row.inventory.committed),
      },
    };
  }

  async createOffer(sellerId: string, input: CreateOfferInput) {
    return db.transaction(async (tx) => {
      // 1. Ensure Commercial Product exists for Variation
      let [cp] = await tx
        .select()
        .from(commercialProduct)
        .where(eq(commercialProduct.variationId, input.variationId))
        .limit(1);

      if (!cp) {
        const [insertedCp] = await tx
          .insert(commercialProduct)
          .values({ variationId: input.variationId, isActive: true })
          .returning();
        cp = insertedCp;
      }

      if (!cp) {
        throw new Error('Falha ao obter produto comercial para a variação');
      }

      // 2. Insert Offer
      const [newOffer] = await tx
        .insert(offer)
        .values({
          commercialProductId: cp.id,
          sellerId,
          title: input.title,
          price: input.price,
          condition: input.condition,
          packagingState: input.packagingState || null,
          description: input.description || null,
          status: input.initialStock > 0 ? 'ACTIVE' : 'DRAFT',
          photos: input.photos,
          isPreOrder: input.isPreOrder ?? false,
          preOrderEstimatedArrival: input.preOrderEstimatedArrival || null,
          allowDepositAndBalance: input.allowDepositAndBalance ?? true,
          depositAmount: input.depositAmount || null,
          allowFullOnArrival: input.allowFullOnArrival ?? true,
          allowInstallments: input.allowInstallments ?? false,
          maxInstallments: input.maxInstallments ?? 1,
          packageWeightGrams: input.packageWeightGrams !== undefined ? input.packageWeightGrams : null,
          shippingAddressId: input.shippingAddressId || null,
        })
        .returning();

      if (!newOffer) {
        throw new Error('Falha ao criar oferta');
      }

      // 3. Insert Commercial Inventory
      const [inv] = await tx
        .insert(commercialInventory)
        .values({
          offerId: newOffer.id,
          onHand: input.initialStock,
          reserved: 0,
          committed: 0,
        })
        .returning();

      if (!inv) {
        throw new Error('Falha ao inicializar estoque comercial');
      }

      // 4. Record Initial Movement if stock > 0
      if (input.initialStock > 0) {
        await tx.insert(inventoryMovement).values({
          inventoryId: inv.id,
          type: 'STOCK_IN',
          quantity: input.initialStock,
          reason: 'Carga inicial de estoque da oferta',
        });
      }

      return {
        ...newOffer,
        inventory: {
          ...inv,
          available: inv.onHand,
        },
      };
    });
  }

  async updateOffer(offerId: string, sellerId: string, userId: string, input: UpdateOfferInput) {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(offer)
        .where(and(eq(offer.id, offerId), eq(offer.sellerId, sellerId)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError('Oferta não encontrada ou pertence a outro vendedor');
      }

      // Record price history if price changed
      if (input.price && input.price !== existing.price) {
        await tx.insert(offerPriceHistory).values({
          offerId,
          oldPrice: existing.price,
          newPrice: input.price,
          changedBy: userId,
        });
      }

      const [updated] = await tx
        .update(offer)
        .set({
          title: input.title !== undefined ? input.title : existing.title,
          price: input.price !== undefined ? input.price : existing.price,
          condition: input.condition !== undefined ? input.condition : existing.condition,
          packagingState: input.packagingState !== undefined ? input.packagingState : existing.packagingState,
          description: input.description !== undefined ? input.description : existing.description,
          status: input.status !== undefined ? input.status : existing.status,
          photos: input.photos !== undefined ? input.photos : existing.photos,
          isPreOrder: input.isPreOrder !== undefined ? input.isPreOrder : existing.isPreOrder,
          preOrderEstimatedArrival: input.preOrderEstimatedArrival !== undefined ? input.preOrderEstimatedArrival : existing.preOrderEstimatedArrival,
          allowDepositAndBalance: input.allowDepositAndBalance !== undefined ? input.allowDepositAndBalance : existing.allowDepositAndBalance,
          depositAmount: input.depositAmount !== undefined ? input.depositAmount : existing.depositAmount,
          allowFullOnArrival: input.allowFullOnArrival !== undefined ? input.allowFullOnArrival : existing.allowFullOnArrival,
          allowInstallments: input.allowInstallments !== undefined ? input.allowInstallments : existing.allowInstallments,
          maxInstallments: input.maxInstallments !== undefined ? input.maxInstallments : existing.maxInstallments,
          packageWeightGrams: input.packageWeightGrams !== undefined ? input.packageWeightGrams : existing.packageWeightGrams,
          shippingAddressId: input.shippingAddressId !== undefined ? input.shippingAddressId : existing.shippingAddressId,
          updatedAt: new Date(),
        })
        .where(eq(offer.id, offerId))
        .returning();

      return updated;
    });
  }

  async adjustStock(offerId: string, sellerId: string, input: AdjustStockInput) {
    return db.transaction(async (tx) => {
      const [off] = await tx
        .select()
        .from(offer)
        .where(and(eq(offer.id, offerId), eq(offer.sellerId, sellerId)))
        .limit(1);

      if (!off) {
        throw new NotFoundError('Oferta não encontrada');
      }

      const [inv] = await tx
        .select()
        .from(commercialInventory)
        .where(eq(commercialInventory.offerId, offerId))
        .limit(1);

      if (!inv) {
        throw new NotFoundError('Registro de estoque não encontrado para esta oferta');
      }

      let newOnHand = inv.onHand;
      if (input.type === 'STOCK_IN') {
        newOnHand += input.quantity;
      } else if (input.type === 'STOCK_OUT' || input.type === 'LOSS') {
        newOnHand -= input.quantity;
      } else if (input.type === 'ADJUSTMENT') {
        newOnHand = input.quantity;
      }

      // Invariant: onHand cannot be less than reserved + committed
      const minRequired = inv.reserved + inv.committed;
      if (newOnHand < minRequired) {
        throw new BadRequestError(
          `Estoque físico não pode ser inferior às reservas e pedidos ativos (${minRequired} un). Disponibilidade ficaria negativa.`
        );
      }

      const [updatedInv] = await tx
        .update(commercialInventory)
        .set({
          onHand: newOnHand,
          updatedAt: new Date(),
        })
        .where(eq(commercialInventory.id, inv.id))
        .returning();

      if (!updatedInv) {
        throw new Error('Falha ao atualizar estoque');
      }

      await tx.insert(inventoryMovement).values({
        inventoryId: inv.id,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason || null,
      });

      // Auto update status to OUT_OF_STOCK if available becomes 0 and currently ACTIVE
      const available = updatedInv.onHand - updatedInv.reserved - updatedInv.committed;
      if (available <= 0 && off.status === 'ACTIVE') {
        await tx.update(offer).set({ status: 'OUT_OF_STOCK' }).where(eq(offer.id, offerId));
      } else if (available > 0 && off.status === 'OUT_OF_STOCK') {
        await tx.update(offer).set({ status: 'ACTIVE' }).where(eq(offer.id, offerId));
      }

      return {
        ...updatedInv,
        available,
      };
    });
  }
}
