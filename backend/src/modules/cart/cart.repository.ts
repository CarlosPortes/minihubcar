import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  cart,
  cartItem,
  offer,
  commercialInventory,
  commercialProduct,
  variation,
  casting,
  miniatureBrand,
  sellerProfile,
  sellerAuthorization,
} from '../../database/schema';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class CartRepository {
  async getOrCreateCart(userId: string) {
    let [userCart] = await db
      .select()
      .from(cart)
      .where(eq(cart.userId, userId))
      .limit(1);

    if (!userCart) {
      const [inserted] = await db
        .insert(cart)
        .values({ userId })
        .returning();
      if (!inserted) {
        throw new Error('Falha ao criar carrinho para o usuário');
      }
      userCart = inserted;
    }

    return userCart;
  }

  async getCartWithItems(userId: string) {
    const userCart = await this.getOrCreateCart(userId);

    const items = await db
      .select({
        id: cartItem.id,
        cartId: cartItem.cartId,
        offerId: cartItem.offerId,
        quantity: cartItem.quantity,
        createdAt: cartItem.createdAt,
        offer: {
          id: offer.id,
          title: offer.title,
          price: offer.price,
          condition: offer.condition,
          packagingState: offer.packagingState,
          status: offer.status,
          photos: offer.photos,
        },
        inventory: {
          available: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
        },
        variation: {
          id: variation.id,
          name: variation.name,
          photoUrl: variation.photoUrl,
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
          isApproved: sql<boolean>`${sellerAuthorization.status} = 'APPROVED'`,
        },
      })
      .from(cartItem)
      .innerJoin(offer, eq(cartItem.offerId, offer.id))
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(commercialProduct, eq(offer.commercialProductId, commercialProduct.id))
      .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
      .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
      .where(eq(cartItem.cartId, userCart.id));

    let subtotal = 0;
    let totalItems = 0;

    const formattedItems = items.map((it) => {
      const unitPrice = parseFloat(it.offer.price) || 0;
      const itemTotal = unitPrice * it.quantity;
      subtotal += itemTotal;
      totalItems += it.quantity;

      return {
        ...it,
        unitPrice,
        totalPrice: itemTotal,
        isAvailable:
          it.offer.status === 'ACTIVE' &&
          it.seller.isApproved &&
          it.inventory.available >= it.quantity,
      };
    });

    return {
      id: userCart.id,
      userId: userCart.userId,
      items: formattedItems,
      subtotal: subtotal.toFixed(2),
      totalItems,
      updatedAt: userCart.updatedAt,
    };
  }

  async addItem(userId: string, offerId: string, quantity: number) {
    const userCart = await this.getOrCreateCart(userId);

    return db.transaction(async (tx) => {
      // 1. Verify offer & inventory
      const [off] = await tx
        .select({
          id: offer.id,
          status: offer.status,
          sellerId: offer.sellerId,
          sellerActive: sellerProfile.isActive,
          authStatus: sellerAuthorization.status,
          available: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
        })
        .from(offer)
        .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
        .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
        .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
        .where(eq(offer.id, offerId))
        .limit(1);

      if (!off) {
        throw new NotFoundError('Oferta não encontrada');
      }

      if (off.status !== 'ACTIVE' || !off.sellerActive || off.authStatus !== 'APPROVED') {
        throw new BadRequestError('Esta oferta não está disponível para compra');
      }

      // Check existing item in cart
      const [existingItem] = await tx
        .select()
        .from(cartItem)
        .where(and(eq(cartItem.cartId, userCart.id), eq(cartItem.offerId, offerId)))
        .limit(1);

      const requestedTotalQuantity = (existingItem?.quantity || 0) + quantity;

      if (off.available < requestedTotalQuantity) {
        throw new BadRequestError(
          `Estoque insuficiente. Apenas ${off.available} unidade(s) disponível(is).`
        );
      }

      if (existingItem) {
        const [updated] = await tx
          .update(cartItem)
          .set({ quantity: requestedTotalQuantity })
          .where(eq(cartItem.id, existingItem.id))
          .returning();
        return updated;
      } else {
        const [inserted] = await tx
          .insert(cartItem)
          .values({
            cartId: userCart.id,
            offerId,
            quantity,
          })
          .returning();
        return inserted;
      }
    });
  }

  async updateItemQuantity(userId: string, cartItemId: string, newQuantity: number) {
    const userCart = await this.getOrCreateCart(userId);

    return db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(cartItem)
        .where(and(eq(cartItem.id, cartItemId), eq(cartItem.cartId, userCart.id)))
        .limit(1);

      if (!item) {
        throw new NotFoundError('Item do carrinho não encontrado');
      }

      // Verify availability
      const [off] = await tx
        .select({
          available: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
        })
        .from(commercialInventory)
        .where(eq(commercialInventory.offerId, item.offerId))
        .limit(1);

      if (!off || off.available < newQuantity) {
        throw new BadRequestError(
          `Estoque insuficiente. Disponível no momento: ${off?.available || 0} unidade(s).`
        );
      }

      const [updated] = await tx
        .update(cartItem)
        .set({ quantity: newQuantity })
        .where(eq(cartItem.id, cartItemId))
        .returning();

      return updated;
    });
  }

  async removeItem(userId: string, cartItemId: string) {
    const userCart = await this.getOrCreateCart(userId);

    const [deleted] = await db
      .delete(cartItem)
      .where(and(eq(cartItem.id, cartItemId), eq(cartItem.cartId, userCart.id)))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Item não encontrado no seu carrinho');
    }

    return deleted;
  }

  async clearCart(userId: string) {
    const userCart = await this.getOrCreateCart(userId);
    await db.delete(cartItem).where(eq(cartItem.cartId, userCart.id));
  }
}
