import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  collectorExternalPreOrder,
  externalPreOrderPayment,
  variation,
  casting,
  miniatureBrand,
  scale,
  conditionType,
  collectionExemplar,
  exemplarLocation,
  acquisition,
  acquisitionItem,
  customCollectible,
} from '../../database/schema';
import {
  CreateExternalPreOrderInput,
  UpdateExternalPreOrderInput,
  AddExternalPaymentInput,
  ConvertToCollectionInput,
} from './external-pre-orders.schemas';

export class ExternalPreOrdersRepository {
  async listByUser(userId: string, filter?: { status?: string }) {
    const conditions = [eq(collectorExternalPreOrder.userId, userId)];

    if (filter?.status) {
      conditions.push(eq(collectorExternalPreOrder.status, filter.status));
    }

    const rows = await db
      .select({
        id: collectorExternalPreOrder.id,
        userId: collectorExternalPreOrder.userId,
        variationId: collectorExternalPreOrder.variationId,
        customMiniatureName: collectorExternalPreOrder.customMiniatureName,
        customBrand: collectorExternalPreOrder.customBrand,
        customScale: collectorExternalPreOrder.customScale,
        customPhotoUrl: collectorExternalPreOrder.customPhotoUrl,
        sellerName: collectorExternalPreOrder.sellerName,
        sellerContact: collectorExternalPreOrder.sellerContact,
        quantity: collectorExternalPreOrder.quantity,
        totalAmount: collectorExternalPreOrder.totalAmount,
        paidAmount: collectorExternalPreOrder.paidAmount,
        remainingAmount: collectorExternalPreOrder.remainingAmount,
        orderDate: collectorExternalPreOrder.orderDate,
        estimatedArrival: collectorExternalPreOrder.estimatedArrival,
        status: collectorExternalPreOrder.status,
        trackingCode: collectorExternalPreOrder.trackingCode,
        trackingCarrier: collectorExternalPreOrder.trackingCarrier,
        convertedExemplarId: collectorExternalPreOrder.convertedExemplarId,
        notes: collectorExternalPreOrder.notes,
        createdAt: collectorExternalPreOrder.createdAt,
        updatedAt: collectorExternalPreOrder.updatedAt,
        // Joined variation data
        catalogName: variation.name,
        catalogPhotoUrl: variation.photoUrl,
        catalogReleaseYear: variation.releaseYear,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        scaleName: scale.name,
      })
      .from(collectorExternalPreOrder)
      .leftJoin(variation, eq(collectorExternalPreOrder.variationId, variation.id))
      .leftJoin(casting, eq(variation.castingId, casting.id))
      .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(and(...conditions))
      .orderBy(desc(collectorExternalPreOrder.createdAt));

    // Fetch payments for all retrieved orders
    const orderIds = rows.map((r) => r.id);
    const paymentsMap: Record<string, any[]> = {};

    if (orderIds.length > 0) {
      const payments = await db
        .select()
        .from(externalPreOrderPayment)
        .where(inArray(externalPreOrderPayment.preOrderId, orderIds))
        .orderBy(desc(externalPreOrderPayment.paidAt), desc(externalPreOrderPayment.createdAt));

      payments.forEach((p) => {
        if (!paymentsMap[p.preOrderId]) {
          paymentsMap[p.preOrderId] = [];
        }
        paymentsMap[p.preOrderId]!.push(p);
      });
    }

    return rows.map((r) => {
      const displayName = r.catalogName
        ? `${r.brandName ? r.brandName + ' ' : ''}${r.castingName || r.catalogName}`
        : r.customMiniatureName || 'Miniatura sem nome';

      const displayPhoto = r.catalogPhotoUrl || r.customPhotoUrl || null;
      const displayBrand = r.brandName || r.customBrand || 'Outro';
      const displayScale = r.scaleName || r.customScale || '1/64';

      return {
        ...r,
        displayName,
        displayPhoto,
        displayBrand,
        displayScale,
        payments: paymentsMap[r.id] || [],
      };
    });
  }

  async getByIdAndUser(id: string, userId: string) {
    const rows = await db
      .select({
        id: collectorExternalPreOrder.id,
        userId: collectorExternalPreOrder.userId,
        variationId: collectorExternalPreOrder.variationId,
        customMiniatureName: collectorExternalPreOrder.customMiniatureName,
        customBrand: collectorExternalPreOrder.customBrand,
        customScale: collectorExternalPreOrder.customScale,
        customPhotoUrl: collectorExternalPreOrder.customPhotoUrl,
        sellerName: collectorExternalPreOrder.sellerName,
        sellerContact: collectorExternalPreOrder.sellerContact,
        quantity: collectorExternalPreOrder.quantity,
        totalAmount: collectorExternalPreOrder.totalAmount,
        paidAmount: collectorExternalPreOrder.paidAmount,
        remainingAmount: collectorExternalPreOrder.remainingAmount,
        orderDate: collectorExternalPreOrder.orderDate,
        estimatedArrival: collectorExternalPreOrder.estimatedArrival,
        status: collectorExternalPreOrder.status,
        trackingCode: collectorExternalPreOrder.trackingCode,
        trackingCarrier: collectorExternalPreOrder.trackingCarrier,
        convertedExemplarId: collectorExternalPreOrder.convertedExemplarId,
        notes: collectorExternalPreOrder.notes,
        createdAt: collectorExternalPreOrder.createdAt,
        updatedAt: collectorExternalPreOrder.updatedAt,
        catalogName: variation.name,
        catalogPhotoUrl: variation.photoUrl,
        catalogReleaseYear: variation.releaseYear,
        castingName: casting.name,
        brandName: miniatureBrand.name,
        scaleName: scale.name,
      })
      .from(collectorExternalPreOrder)
      .leftJoin(variation, eq(collectorExternalPreOrder.variationId, variation.id))
      .leftJoin(casting, eq(variation.castingId, casting.id))
      .leftJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .leftJoin(scale, eq(variation.scaleId, scale.id))
      .where(and(eq(collectorExternalPreOrder.id, id), eq(collectorExternalPreOrder.userId, userId)))
      .limit(1);

    if (rows.length === 0 || !rows[0]) return null;
    const r = rows[0];

    const payments = await db
      .select()
      .from(externalPreOrderPayment)
      .where(eq(externalPreOrderPayment.preOrderId, id))
      .orderBy(desc(externalPreOrderPayment.paidAt), desc(externalPreOrderPayment.createdAt));

    const displayName = r.catalogName
      ? `${r.brandName ? r.brandName + ' ' : ''}${r.castingName || r.catalogName}`
      : r.customMiniatureName || 'Miniatura sem nome';

    return {
      ...r,
      displayName,
      displayPhoto: r.catalogPhotoUrl || r.customPhotoUrl || null,
      displayBrand: r.brandName || r.customBrand || 'Outro',
      displayScale: r.scaleName || r.customScale || '1/64',
      payments,
    };
  }

  async create(userId: string, input: CreateExternalPreOrderInput) {
    const totalAmountNum = input.totalAmount;
    const paidAmountNum = input.paidAmount || 0;
    const remainingAmountNum = Math.max(0, totalAmountNum - paidAmountNum);

    return await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(collectorExternalPreOrder)
        .values({
          userId,
          variationId: input.variationId || null,
          customMiniatureName: input.customMiniatureName || null,
          customBrand: input.customBrand || null,
          customScale: input.customScale || '1/64',
          customPhotoUrl: input.customPhotoUrl || null,
          sellerName: input.sellerName,
          sellerContact: input.sellerContact || null,
          quantity: input.quantity || 1,
          totalAmount: totalAmountNum.toFixed(2),
          paidAmount: paidAmountNum.toFixed(2),
          remainingAmount: remainingAmountNum.toFixed(2),
          orderDate: input.orderDate || new Date().toISOString().slice(0, 10),
          estimatedArrival: input.estimatedArrival || null,
          status: input.status || 'RESERVED',
          trackingCode: input.trackingCode || null,
          trackingCarrier: input.trackingCarrier || null,
          notes: input.notes || null,
        })
        .returning();

      if (!newOrder) {
        throw new Error('Falha ao criar pré-venda externa');
      }

      // If initial deposit/payment was made, record it
      if (paidAmountNum > 0) {
        await tx.insert(externalPreOrderPayment).values({
          preOrderId: newOrder.id,
          amount: paidAmountNum.toFixed(2),
          paidAt: input.orderDate || new Date().toISOString().slice(0, 10),
          description: 'Sinal / Pagamento Inicial',
          paymentMethod: 'PIX',
          notes: 'Registrado no cadastro da pré-venda',
        });
      }

      return newOrder;
    });
  }

  async update(id: string, userId: string, input: UpdateExternalPreOrderInput) {
    const existing = await this.getByIdAndUser(id, userId);
    if (!existing) return null;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.sellerName !== undefined) updateData.sellerName = input.sellerName;
    if (input.sellerContact !== undefined) updateData.sellerContact = input.sellerContact;
    if (input.customMiniatureName !== undefined) updateData.customMiniatureName = input.customMiniatureName;
    if (input.customBrand !== undefined) updateData.customBrand = input.customBrand;
    if (input.customScale !== undefined) updateData.customScale = input.customScale;
    if (input.customPhotoUrl !== undefined) updateData.customPhotoUrl = input.customPhotoUrl;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.estimatedArrival !== undefined) updateData.estimatedArrival = input.estimatedArrival;
    if (input.trackingCode !== undefined) updateData.trackingCode = input.trackingCode;
    if (input.trackingCarrier !== undefined) updateData.trackingCarrier = input.trackingCarrier;
    if (input.notes !== undefined) updateData.notes = input.notes;

    if (input.totalAmount !== undefined) {
      const newTotal = input.totalAmount;
      const currentPaid = parseFloat(existing.paidAmount || '0') || 0;
      updateData.totalAmount = newTotal.toFixed(2);
      updateData.remainingAmount = Math.max(0, newTotal - currentPaid).toFixed(2);
    }

    const [updated] = await db
      .update(collectorExternalPreOrder)
      .set(updateData)
      .where(and(eq(collectorExternalPreOrder.id, id), eq(collectorExternalPreOrder.userId, userId)))
      .returning();

    return updated;
  }

  async addPayment(preOrderId: string, userId: string, input: AddExternalPaymentInput) {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(collectorExternalPreOrder)
        .where(and(eq(collectorExternalPreOrder.id, preOrderId), eq(collectorExternalPreOrder.userId, userId)))
        .limit(1);

      if (!order) return null;

      const paymentDate = input.paidAt || new Date().toISOString().slice(0, 10);
      const [payment] = await tx
        .insert(externalPreOrderPayment)
        .values({
          preOrderId: order.id,
          amount: input.amount.toFixed(2),
          paidAt: paymentDate,
          description: input.description,
          paymentMethod: input.paymentMethod || 'PIX',
          notes: input.notes || null,
        })
        .returning();

      // Recalculate paid and remaining amounts
      const currentPaid = parseFloat(order.paidAmount) || 0;
      const currentTotal = parseFloat(order.totalAmount) || 0;
      const newPaid = currentPaid + input.amount;
      const newRemaining = Math.max(0, currentTotal - newPaid);

      const [updatedOrder] = await tx
        .update(collectorExternalPreOrder)
        .set({
          paidAmount: newPaid.toFixed(2),
          remainingAmount: newRemaining.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(collectorExternalPreOrder.id, order.id))
        .returning();

      return { payment, order: updatedOrder };
    });
  }

  async delete(id: string, userId: string) {
    const [deleted] = await db
      .delete(collectorExternalPreOrder)
      .where(and(eq(collectorExternalPreOrder.id, id), eq(collectorExternalPreOrder.userId, userId)))
      .returning();

    return deleted || null;
  }

  async convertToCollection(
    id: string,
    userId: string,
    input: ConvertToCollectionInput,
    conditionTypeId: string
  ) {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(collectorExternalPreOrder)
        .where(and(eq(collectorExternalPreOrder.id, id), eq(collectorExternalPreOrder.userId, userId)))
        .limit(1);

      if (!order) throw new Error('Pré-venda não encontrada');
      if (order.status === 'RECEIVED' || order.convertedExemplarId) {
        throw new Error('Esta pré-venda já foi convertida para a sua coleção');
      }

      const totalPaid = order.paidAmount || order.totalAmount;
      const acquisitionDate = new Date().toISOString().slice(0, 10);
      let createdExemplarId: string;

      if (order.variationId) {
        // 1. Create collection_exemplar
        const [exemplar] = await tx
          .insert(collectionExemplar)
          .values({
            userId,
            variationId: order.variationId,
            conditionTypeId,
            status: 'ACTIVE',
            acquisitionDate,
            purchasePrice: totalPaid,
            purchaseLocation: order.sellerName,
            notes: input.notes || order.notes || `Adquirido via pré-venda externa com ${order.sellerName}`,
          })
          .returning();

        if (!exemplar) throw new Error('Erro ao criar exemplar da coleção');
        createdExemplarId = exemplar.id;

        // 2. Set location if provided
        if (input.locationId) {
          await tx.insert(exemplarLocation).values({
            userId,
            exemplarId: exemplar.id,
            locationId: input.locationId,
            gridRow: input.gridRow || null,
            gridColumn: input.gridColumn || null,
            isCurrent: true,
          });
        }

        // 3. Register acquisition event
        const [acq] = await tx
          .insert(acquisition)
          .values({
            userId,
            acquisitionType: 'PURCHASE',
            acquisitionDate,
            sourceName: order.sellerName,
            notes: `Pré-venda externa recebida. Vendedor: ${order.sellerName}`,
          })
          .returning();

        if (!acq) throw new Error('Erro ao registrar aquisição');

        await tx.insert(acquisitionItem).values({
          acquisitionId: acq.id,
          exemplarId: exemplar.id,
          quantity: order.quantity || 1,
          unitCost: (parseFloat(totalPaid) / (order.quantity || 1)).toFixed(2),
          totalCost: totalPaid,
        });
      } else {
        // If no official catalog variation, create in custom_collectible
        const [custom] = await tx
          .insert(customCollectible)
          .values({
            userId,
            name: order.customMiniatureName || 'Miniatura Colecionável',
            category: 'OTHER',
            manufacturer: order.customBrand || 'Outro',
            scale: order.customScale || '1/64',
            conditionCode: input.conditionCode || 'MINT',
            purchasePrice: totalPaid,
            purchaseLocation: order.sellerName,
            acquisitionDate,
            locationId: input.locationId || null,
            gridRow: input.gridRow || null,
            gridColumn: input.gridColumn || null,
            photoUrl: order.customPhotoUrl || null,
            notes: input.notes || order.notes || `Adquirido via pré-venda externa com ${order.sellerName}`,
            status: 'ACTIVE',
          })
          .returning();

        if (!custom) throw new Error('Erro ao criar colecionável customizado');
        createdExemplarId = custom.id;
      }

      // 4. Update external pre-order to RECEIVED and link exemplar
      const [updatedOrder] = await tx
        .update(collectorExternalPreOrder)
        .set({
          status: 'RECEIVED',
          convertedExemplarId: order.variationId ? createdExemplarId : null,
          remainingAmount: '0.00',
          updatedAt: new Date(),
        })
        .where(eq(collectorExternalPreOrder.id, id))
        .returning();

      return {
        preOrder: updatedOrder,
        exemplarId: createdExemplarId,
      };
    });
  }

  async getSummary(userId: string) {
    const rows = await db
      .select({
        totalAmount: collectorExternalPreOrder.totalAmount,
        paidAmount: collectorExternalPreOrder.paidAmount,
        remainingAmount: collectorExternalPreOrder.remainingAmount,
        quantity: collectorExternalPreOrder.quantity,
        status: collectorExternalPreOrder.status,
      })
      .from(collectorExternalPreOrder)
      .where(eq(collectorExternalPreOrder.userId, userId));

    let totalContracted = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalItems = 0;
    let activeCount = 0;
    let receivedCount = 0;

    rows.forEach((r) => {
      const total = parseFloat(r.totalAmount) || 0;
      const paid = parseFloat(r.paidAmount) || 0;
      const remaining = parseFloat(r.remainingAmount) || 0;
      const qty = r.quantity || 1;

      totalContracted += total;
      totalPaid += paid;
      totalRemaining += remaining;
      totalItems += qty;

      if (r.status === 'RECEIVED') {
        receivedCount++;
      } else if (r.status !== 'CANCELLED') {
        activeCount++;
      }
    });

    return {
      totalContracted,
      totalPaid,
      totalRemaining,
      totalItems,
      activeCount,
      receivedCount,
      totalCount: rows.length,
    };
  }

  async getConditionTypeByCode(code: string) {
    const rows = await db
      .select()
      .from(conditionType)
      .where(eq(conditionType.code, code))
      .limit(1);

    return rows[0] || null;
  }
}
