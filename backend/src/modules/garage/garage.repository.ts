import { eq, and, ne, isNull, desc, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  order,
  orderItem,
  preOrder,
  offer,
  commercialInventory,
  inventoryMovement,
  sellerProfile,
  sellerShippingAddress,
  appUser,
  variation,
  casting,
  miniatureBrand,
  scale,
} from '../../database/schema';
import { DispatchGarageInput } from './garage.schemas';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/api-error';

export interface GarageItemView {
  id: string;
  sourceType: 'ORDER' | 'PRE_ORDER';
  orderId?: string;
  orderNumber?: string;
  preOrderId?: string;
  preOrderNumber?: string;
  title: string;
  variationName: string;
  brandName: string;
  castingName: string;
  scaleName: string;
  photoUrl: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  packageWeightGrams: number | null;
  fulfillmentStatus: string;
  hasArrived: boolean;
  canCancel: boolean;
  canDispatch: boolean;
  createdAt: string;
}

export interface SellerGarageGroup {
  sellerId: string;
  storeName: string;
  slug: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  dispatchAddressLabel: string | null;
  items: GarageItemView[];
  totalItems: number;
  totalValue: number;
  readyForDispatchCount: number;
}

export interface MyGarageResponse {
  summary: {
    totalItems: number;
    totalValue: number;
    totalSellers: number;
    readyForDispatchCount: number;
  };
  sellers: SellerGarageGroup[];
}

export class GarageRepository {
  /**
   * Lists all items currently in the authenticated user's garage, grouped by seller.
   */
  async listMyGarage(buyerUserId: string): Promise<MyGarageResponse> {
    // 1. Fetch Regular Order Items in Garage
    const orderItemsRows = await db
      .select({
        id: orderItem.id,
        orderId: orderItem.orderId,
        orderNumber: order.orderNumber,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
        quantity: orderItem.quantity,
        fulfillmentStatus: orderItem.fulfillmentStatus,
        createdAt: orderItem.createdAt,
        variationSnapshot: orderItem.variationSnapshot,
        packageWeightGrams: offer.packageWeightGrams,
        offerId: orderItem.offerId,
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
          postalCode: sellerProfile.postalCode,
        },
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .innerJoin(sellerProfile, eq(orderItem.sellerId, sellerProfile.id))
      .leftJoin(offer, eq(orderItem.offerId, offer.id))
      .where(
        and(
          eq(order.userId, buyerUserId),
          inArray(orderItem.fulfillmentStatus, ['NA_GARAGEM', 'AGUARDANDO_ENVIO']),
          ne(order.status, 'CANCELLED')
        )
      )
      .orderBy(desc(orderItem.createdAt));

    // 2. Fetch Buyer Pre-Orders in Garage
    const preOrderRows = await db
      .select({
        id: preOrder.id,
        preOrderNumber: preOrder.preOrderNumber,
        unitPrice: offer.price,
        totalAmount: preOrder.totalAmount,
        quantity: preOrder.quantity,
        status: preOrder.status,
        fulfillmentStatus: preOrder.fulfillmentStatus,
        hasArrived: offer.hasArrived,
        createdAt: preOrder.createdAt,
        offerId: preOrder.offerId,
        packageWeightGrams: offer.packageWeightGrams,
        variationName: variation.name,
        photoUrl: variation.photoUrl,
        brandName: miniatureBrand.name,
        castingName: casting.name,
        scaleName: scale.name,
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
          postalCode: sellerProfile.postalCode,
        },
      })
      .from(preOrder)
      .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
      .innerJoin(offer, eq(preOrder.offerId, offer.id))
      .innerJoin(commercialInventory, eq(offer.id, commercialInventory.offerId))
      .innerJoin(variation, eq(preOrder.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(
        and(
          eq(preOrder.buyerId, buyerUserId),
          inArray(preOrder.fulfillmentStatus, ['NA_GARAGEM', 'AGUARDANDO_ENVIO']),
          ne(preOrder.status, 'CANCELLED'),
          isNull(preOrder.rejectedAt)
        )
      )
      .orderBy(desc(preOrder.createdAt));

    // 3. Group by Seller
    const sellersMap = new Map<string, SellerGarageGroup>();

    // Helper to get or init group
    const getGroup = (seller: any): SellerGarageGroup => {
      if (!sellersMap.has(seller.id)) {
        sellersMap.set(seller.id, {
          sellerId: seller.id,
          storeName: seller.storeName,
          slug: seller.slug,
          city: seller.city,
          state: seller.state,
          postalCode: seller.postalCode,
          dispatchAddressLabel: 'Loja Principal',
          items: [],
          totalItems: 0,
          totalValue: 0,
          readyForDispatchCount: 0,
        });
      }
      return sellersMap.get(seller.id)!;
    };

    // Process regular order items
    for (const r of orderItemsRows) {
      const group = getGroup(r.seller);
      const snap: any = r.variationSnapshot || {};
      const unitPrice = parseFloat(r.unitPrice) || 0;
      const totalPrice = parseFloat(r.totalPrice) || unitPrice * r.quantity;
      const isReady = r.fulfillmentStatus === 'NA_GARAGEM';

      group.items.push({
        id: r.id,
        sourceType: 'ORDER',
        orderId: r.orderId,
        orderNumber: r.orderNumber,
        title: snap.name || 'Miniatura',
        variationName: snap.name || 'Miniatura',
        brandName: snap.brandName || '',
        castingName: snap.castingName || '',
        scaleName: snap.scaleName || '1:64',
        photoUrl: snap.photoUrl || null,
        unitPrice,
        quantity: r.quantity,
        totalPrice,
        packageWeightGrams: r.packageWeightGrams || null,
        fulfillmentStatus: r.fulfillmentStatus,
        hasArrived: true, // Physical stock already confirmed in regular purchases
        canCancel: r.fulfillmentStatus === 'NA_GARAGEM',
        canDispatch: isReady,
        createdAt: r.createdAt.toISOString(),
      });

      group.totalItems += r.quantity;
      group.totalValue += totalPrice;
      if (isReady) group.readyForDispatchCount += r.quantity;
    }

    // Process pre-orders
    for (const po of preOrderRows) {
      const group = getGroup(po.seller);
      const unitPrice = parseFloat(po.unitPrice) || 0;
      const totalAmount = parseFloat(po.totalAmount) || unitPrice * po.quantity;
      const hasArrived = !!po.hasArrived;
      const isReady = hasArrived && po.fulfillmentStatus === 'NA_GARAGEM';

      group.items.push({
        id: po.id,
        sourceType: 'PRE_ORDER',
        preOrderId: po.id,
        preOrderNumber: po.preOrderNumber,
        title: po.variationName,
        variationName: po.variationName,
        brandName: po.brandName,
        castingName: po.castingName,
        scaleName: po.scaleName || '1:64',
        photoUrl: po.photoUrl || null,
        unitPrice,
        quantity: po.quantity,
        totalPrice: totalAmount,
        packageWeightGrams: po.packageWeightGrams || null,
        fulfillmentStatus: po.fulfillmentStatus,
        hasArrived,
        canCancel: false, // Pre-order cancellation follows contract/financial schedule rules
        canDispatch: isReady,
        createdAt: po.createdAt.toISOString(),
      });

      group.totalItems += po.quantity;
      group.totalValue += totalAmount;
      if (isReady) group.readyForDispatchCount += po.quantity;
    }

    // 4. Also fetch default seller shipping address for each seller if available
    const sellerIds = Array.from(sellersMap.keys());
    if (sellerIds.length > 0) {
      const addresses = await db
        .select()
        .from(sellerShippingAddress)
        .where(inArray(sellerShippingAddress.sellerId, sellerIds));

      for (const addr of addresses) {
        const group = sellersMap.get(addr.sellerId);
        if (group && (addr.isDefault || !group.postalCode)) {
          group.postalCode = addr.postalCode;
          group.city = addr.city;
          group.state = addr.state;
          group.dispatchAddressLabel = addr.label;
        }
      }
    }

    // 5. Compute global summary
    const sellers = Array.from(sellersMap.values());
    let totalItems = 0;
    let totalValue = 0;
    let readyForDispatchCount = 0;

    for (const s of sellers) {
      totalItems += s.totalItems;
      totalValue += s.totalValue;
      readyForDispatchCount += s.readyForDispatchCount;
    }

    return {
      summary: {
        totalItems,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalSellers: sellers.length,
        readyForDispatchCount,
      },
      sellers,
    };
  }

  /**
   * Cancels a purchased order item from the garage:
   * - Marks order item as CANCELLED
   * - Restores physical inventory (onHand)
   * - Reactivates offer status to ACTIVE if it was OUT_OF_STOCK
   */
  async cancelGarageItem(orderItemId: string, buyerUserId: string, reason?: string) {
    return db.transaction(async (tx) => {
      // 1. Fetch item with order and offer
      const [itemRow] = await tx
        .select({
          id: orderItem.id,
          orderId: orderItem.orderId,
          offerId: orderItem.offerId,
          quantity: orderItem.quantity,
          fulfillmentStatus: orderItem.fulfillmentStatus,
          buyerUserId: order.userId,
          orderStatus: order.status,
          orderNumber: order.orderNumber,
        })
        .from(orderItem)
        .innerJoin(order, eq(orderItem.orderId, order.id))
        .where(eq(orderItem.id, orderItemId))
        .limit(1);

      if (!itemRow) {
        throw new NotFoundError('Item da garagem não encontrado');
      }

      if (itemRow.buyerUserId !== buyerUserId) {
        throw new ForbiddenError('Você não tem permissão para cancelar este item');
      }

      if (itemRow.fulfillmentStatus !== 'NA_GARAGEM') {
        throw new BadRequestError(
          `Apenas itens com status 'Na Garagem' podem ser cancelados. Status atual: ${itemRow.fulfillmentStatus}`
        );
      }

      // 2. Mark order item as CANCELLED
      await tx
        .update(orderItem)
        .set({
          fulfillmentStatus: 'CANCELLED',
        })
        .where(eq(orderItem.id, orderItemId));

      // 3. Check if all items in this order are now cancelled
      const allItems = await tx
        .select({ id: orderItem.id, fulfillmentStatus: orderItem.fulfillmentStatus })
        .from(orderItem)
        .where(eq(orderItem.orderId, itemRow.orderId));

      const allCancelled = allItems.every(
        (it) => it.id === orderItemId || it.fulfillmentStatus === 'CANCELLED'
      );
      if (allCancelled) {
        await tx
          .update(order)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(eq(order.id, itemRow.orderId));
      }

      // 4. Return physical stock to commercialInventory
      const [inv] = await tx
        .select()
        .from(commercialInventory)
        .where(eq(commercialInventory.offerId, itemRow.offerId))
        .limit(1);

      if (inv) {
        const newOnHand = inv.onHand + itemRow.quantity;
        await tx
          .update(commercialInventory)
          .set({
            onHand: newOnHand,
            updatedAt: new Date(),
          })
          .where(eq(commercialInventory.id, inv.id));

        await tx.insert(inventoryMovement).values({
          inventoryId: inv.id,
          type: 'STOCK_IN',
          quantity: itemRow.quantity,
          reason: reason || `Cancelamento de item na garagem pelo colecionador (Pedido ${itemRow.orderNumber})`,
        });

        // 5. Reactivate offer if it was OUT_OF_STOCK
        const available = newOnHand - inv.reserved - inv.committed;
        if (available > 0) {
          const [targetOffer] = await tx
            .select({ id: offer.id, status: offer.status })
            .from(offer)
            .where(eq(offer.id, itemRow.offerId))
            .limit(1);

          if (targetOffer && (targetOffer.status === 'OUT_OF_STOCK' || targetOffer.status === 'INACTIVE')) {
            await tx
              .update(offer)
              .set({
                status: 'ACTIVE',
                updatedAt: new Date(),
              })
              .where(eq(offer.id, itemRow.offerId));
          }
        }
      }

      return {
        success: true,
        orderItemId,
        fulfillmentStatus: 'CANCELLED',
        message: 'Item cancelado com sucesso. A oferta foi reativada no Marketplace e o estoque foi restabelecido.',
      };
    });
  }

  /**
   * Retrieves selected garage items for shipping calculation.
   */
  async getSelectedGarageItems(sellerId: string, itemIds: string[], buyerUserId: string) {
    // Check in orderItem
    const orderItems = await db
      .select({
        id: orderItem.id,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        packageWeightGrams: offer.packageWeightGrams,
        buyerUserId: order.userId,
        sellerId: orderItem.sellerId,
        fulfillmentStatus: orderItem.fulfillmentStatus,
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .leftJoin(offer, eq(orderItem.offerId, offer.id))
      .where(and(inArray(orderItem.id, itemIds), eq(orderItem.sellerId, sellerId)));

    // Check in preOrder
    const preOrders = await db
      .select({
        id: preOrder.id,
        quantity: preOrder.quantity,
        unitPrice: offer.price,
        packageWeightGrams: offer.packageWeightGrams,
        buyerUserId: preOrder.buyerId,
        sellerId: preOrder.sellerId,
        fulfillmentStatus: preOrder.fulfillmentStatus,
      })
      .from(preOrder)
      .leftJoin(offer, eq(preOrder.offerId, offer.id))
      .where(and(inArray(preOrder.id, itemIds), eq(preOrder.sellerId, sellerId)));

    const combined = [...orderItems, ...preOrders].map((it) => ({
      ...it,
      unitPrice: parseFloat(it.unitPrice || '0') || 0,
    }));

    // Validate ownership
    for (const item of combined) {
      if (item.buyerUserId !== buyerUserId) {
        throw new ForbiddenError('Um ou mais itens selecionados não pertencem à sua garagem');
      }
      if (item.fulfillmentStatus !== 'NA_GARAGEM') {
        throw new BadRequestError(`Item ${item.id} não está disponível para envio (status: ${item.fulfillmentStatus})`);
      }
    }

    if (combined.length === 0) {
      throw new NotFoundError('Nenhum item válido encontrado para os IDs selecionados');
    }

    return combined;
  }

  /**
   * Dispatches selected garage items:
   * - Marks orderItems and preOrders as AGUARDANDO_ENVIO
   * - Saves shipping address and freight amount
   */
  async dispatchGarage(buyerUserId: string, input: DispatchGarageInput) {
    return db.transaction(async (tx) => {
      // 1. Validate items
      const selected = await this.getSelectedGarageItems(input.sellerId, input.itemIds, buyerUserId);

      const orderItemIds = selected
        .filter((it) => input.itemIds.includes(it.id))
        .map((it) => it.id);

      // 2. Update order items to AGUARDANDO_ENVIO
      if (orderItemIds.length > 0) {
        await tx
          .update(orderItem)
          .set({
            fulfillmentStatus: 'AGUARDANDO_ENVIO',
          })
          .where(inArray(orderItem.id, orderItemIds));

        // Get unique order IDs to update snapshot and freight
        const affectedOrders = await tx
          .select({ orderId: orderItem.orderId })
          .from(orderItem)
          .where(inArray(orderItem.id, orderItemIds));

        const uniqueOrderIds = Array.from(new Set(affectedOrders.map((o) => o.orderId)));
        for (const ordId of uniqueOrderIds) {
          await tx
            .update(order)
            .set({
              fulfillmentStatus: 'AGUARDANDO_ENVIO',
              shippingAddressSnapshot: input.shippingAddress,
              freightAmount: input.shippingMethod.price.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(order.id, ordId));
        }
      }

      // 3. Update pre-orders if any
      const preOrderIds = input.itemIds.filter((id) => !orderItemIds.includes(id));
      if (preOrderIds.length > 0) {
        await tx
          .update(preOrder)
          .set({
            fulfillmentStatus: 'AGUARDANDO_ENVIO',
            updatedAt: new Date(),
          })
          .where(inArray(preOrder.id, preOrderIds));
      }

      return {
        success: true,
        dispatchedItemsCount: selected.length,
        sellerId: input.sellerId,
        shippingMethod: input.shippingMethod,
        shippingAddress: input.shippingAddress,
        message: 'Solicitação de despacho da garagem registrada com sucesso! O vendedor foi notificado para embalar e enviar.',
      };
    });
  }
}
