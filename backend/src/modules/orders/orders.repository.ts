import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  order,
  orderItem,
  cart,
  cartItem,
  offer,
  commercialInventory,
  commercialProduct,
  inventoryMovement,
  variation,
  casting,
  miniatureBrand,
  scale,
  sellerProfile,
  sellerAuthorization,
  appUser,
} from '../../database/schema';
import { CheckoutInput } from './orders.schemas';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class OrdersRepository {
  async checkout(userId: string, input: CheckoutInput) {
    return db.transaction(async (tx) => {
      // 1. Get user cart
      const [userCart] = await tx
        .select()
        .from(cart)
        .where(eq(cart.userId, userId))
        .limit(1);

      if (!userCart) {
        throw new BadRequestError('Carrinho vazio ou não encontrado');
      }

      // 2. Get cart items with full details
      const items = await tx
        .select({
          cartItemId: cartItem.id,
          offerId: cartItem.offerId,
          quantity: cartItem.quantity,
          offer: {
            id: offer.id,
            sellerId: offer.sellerId,
            price: offer.price,
            status: offer.status,
          },
          inventory: {
            id: commercialInventory.id,
            onHand: commercialInventory.onHand,
            reserved: commercialInventory.reserved,
            committed: commercialInventory.committed,
            available: sql<number>`(${commercialInventory.onHand} - ${commercialInventory.reserved} - ${commercialInventory.committed})::int`,
          },
          variation: {
            id: variation.id,
            name: variation.name,
            photoUrl: variation.photoUrl,
            releaseYear: variation.releaseYear,
            color: variation.color,
            brandName: miniatureBrand.name,
            castingName: casting.name,
            scaleName: scale.name,
          },
          seller: {
            id: sellerProfile.id,
            storeName: sellerProfile.storeName,
            slug: sellerProfile.slug,
            city: sellerProfile.city,
            state: sellerProfile.state,
            isActive: sellerProfile.isActive,
            authStatus: sellerAuthorization.status,
          },
        })
        .from(cartItem)
        .innerJoin(offer, eq(cartItem.offerId, offer.id))
        .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
        .innerJoin(commercialProduct, eq(offer.commercialProductId, commercialProduct.id))
        .innerJoin(variation, eq(commercialProduct.variationId, variation.id))
        .innerJoin(casting, eq(variation.castingId, casting.id))
        .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
        .leftJoin(scale, eq(variation.scaleId, scale.id))
        .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
        .innerJoin(sellerAuthorization, eq(sellerProfile.id, sellerAuthorization.sellerId))
        .where(eq(cartItem.cartId, userCart.id));

      if (items.length === 0) {
        throw new BadRequestError('Seu carrinho está vazio');
      }

      // 3. Validate availability for every item
      let subtotal = 0;
      let totalItems = 0;

      for (const item of items) {
        if (item.offer.status !== 'ACTIVE' || !item.seller.isActive || item.seller.authStatus !== 'APPROVED') {
          throw new BadRequestError(
            `A miniatura "${item.variation.name}" do vendedor "${item.seller.storeName}" não está mais disponível para venda.`
          );
        }

        if (item.inventory.available < item.quantity) {
          throw new BadRequestError(
            `Estoque insuficiente para "${item.variation.name}". Disponível: ${item.inventory.available}, solicitado: ${item.quantity}.`
          );
        }

        const unitPrice = parseFloat(item.offer.price) || 0;
        subtotal += unitPrice * item.quantity;
        totalItems += item.quantity;
      }

      // 4. Generate order number (e.g. ORD-20260915-XXXXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

      // 5. Create Order
      const deliveryMode = input.deliveryMode || 'DELIVERY';
      const orderFulfillment = deliveryMode === 'GARAGE' ? 'NA_GARAGEM' : 'PENDING';
      const itemFulfillment = deliveryMode === 'GARAGE' ? 'NA_GARAGEM' : 'PENDING';

      const [createdOrder] = await tx
        .insert(order)
        .values({
          userId,
          orderNumber,
          status: 'PENDING_PAYMENT',
          totalItems,
          subtotal: subtotal.toFixed(2),
          freightAmount: '0.00',
          discountAmount: '0.00',
          totalAmount: subtotal.toFixed(2),
          deliveryMode,
          fulfillmentStatus: orderFulfillment,
          shippingAddressSnapshot: input.shippingAddress || null,
        })
        .returning();

      if (!createdOrder) {
        throw new Error('Falha ao registrar pedido');
      }

      // 6. Create Order Items & Update Inventory
      const createdItems = [];
      for (const item of items) {
        const unitPrice = parseFloat(item.offer.price) || 0;
        const totalPrice = unitPrice * item.quantity;

        const newOnHand = item.inventory.onHand - item.quantity;

        // Commit stock: onHand decreases, or reserved -> committed
        await tx
          .update(commercialInventory)
          .set({
            onHand: newOnHand,
            updatedAt: new Date(),
          })
          .where(eq(commercialInventory.id, item.inventory.id));

        await tx.insert(inventoryMovement).values({
          inventoryId: item.inventory.id,
          type: 'STOCK_OUT',
          quantity: item.quantity,
          reason: `Venda no pedido ${orderNumber}`,
        });

        // Automatically update offer status to OUT_OF_STOCK if available becomes 0 and currently ACTIVE
        const remainingAvailable = newOnHand - (item.inventory.reserved || 0) - (item.inventory.committed || 0);
        if (remainingAvailable <= 0) {
          await tx
            .update(offer)
            .set({
              status: 'OUT_OF_STOCK',
              updatedAt: new Date(),
            })
            .where(eq(offer.id, item.offer.id));
        }

        // Insert immutable order item with snapshots
        const [oi] = await tx
          .insert(orderItem)
          .values({
            orderId: createdOrder.id,
            offerId: item.offer.id,
            sellerId: item.seller.id,
            variationId: item.variation.id,
            quantity: item.quantity,
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
            variationSnapshot: {
              id: item.variation.id,
              name: item.variation.name,
              photoUrl: item.variation.photoUrl,
              brandName: item.variation.brandName,
              castingName: item.variation.castingName,
              scaleName: item.variation.scaleName,
              releaseYear: item.variation.releaseYear,
              color: item.variation.color,
            },
            sellerSnapshot: {
              id: item.seller.id,
              storeName: item.seller.storeName,
              slug: item.seller.slug,
              city: item.seller.city,
              state: item.seller.state,
            },
            fulfillmentStatus: itemFulfillment,
          })
          .returning();

        if (oi) {
          createdItems.push(oi);
        }
      }

      // 7. Clear cart
      await tx.delete(cartItem).where(eq(cartItem.cartId, userCart.id));

      return {
        ...createdOrder,
        items: createdItems,
      };
    });
  }

  async listUserOrders(userId: string) {
    const orders = await db
      .select()
      .from(order)
      .where(eq(order.userId, userId))
      .orderBy(desc(order.createdAt));

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];

    const items = await db
      .select()
      .from(orderItem)
      .where(sql`${orderItem.orderId} IN ${orderIds}`);

    const itemsByOrder = new Map<string, typeof items>();
    for (const it of items) {
      if (!itemsByOrder.has(it.orderId)) {
        itemsByOrder.set(it.orderId, []);
      }
      itemsByOrder.get(it.orderId)!.push(it);
    }

    return orders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));
  }

  async getOrderById(orderId: string, userId: string, isAdmin: boolean) {
    const [foundOrder] = await db
      .select()
      .from(order)
      .where(eq(order.id, orderId))
      .limit(1);

    if (!foundOrder) return null;

    const items = await db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId));

    // IDOR Check: user must be the buyer, an admin, or the seller of at least one item
    if (!isAdmin && foundOrder.userId !== userId) {
      const [seller] = await db
        .select()
        .from(sellerProfile)
        .where(eq(sellerProfile.userId, userId))
        .limit(1);

      const isSellerOfItem = seller && items.some((it) => it.sellerId === seller.id);
      if (!isSellerOfItem) {
        throw new NotFoundError('Pedido não encontrado');
      }
    }

    return {
      ...foundOrder,
      items,
    };
  }

  async listSellerSales(sellerId: string) {
    const items = await db
      .select({
        id: orderItem.id,
        orderId: orderItem.orderId,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
        variationSnapshot: orderItem.variationSnapshot,
        fulfillmentStatus: orderItem.fulfillmentStatus,
        createdAt: orderItem.createdAt,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryMode: order.deliveryMode,
          fulfillmentStatus: order.fulfillmentStatus,
          createdAt: order.createdAt,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
        },
        buyer: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          phone: appUser.whatsapp,
        },
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .innerJoin(appUser, eq(order.userId, appUser.id))
      .where(eq(orderItem.sellerId, sellerId))
      .orderBy(desc(orderItem.createdAt));

    return items;
  }

  async updateSaleFulfillment(
    orderItemId: string,
    sellerUserId: string,
    fulfillmentStatus: 'NA_GARAGEM' | 'AGUARDANDO_ENVIO' | 'ENTREGUE'
  ) {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: orderItem.id,
          orderId: orderItem.orderId,
          sellerId: orderItem.sellerId,
          fulfillmentStatus: orderItem.fulfillmentStatus,
          sellerUserId: sellerProfile.userId,
        })
        .from(orderItem)
        .innerJoin(sellerProfile, eq(orderItem.sellerId, sellerProfile.id))
        .where(eq(orderItem.id, orderItemId))
        .limit(1);

      if (!item || item.sellerUserId !== sellerUserId) {
        throw new NotFoundError('Item de venda não encontrado ou não pertence a este vendedor');
      }

      const [updated] = await tx
        .update(orderItem)
        .set({
          fulfillmentStatus,
        })
        .where(eq(orderItem.id, orderItemId))
        .returning();

      return updated;
    });
  }
}
