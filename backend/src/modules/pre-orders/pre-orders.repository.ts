import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import bcrypt from 'bcryptjs';
import {
  preOrder,
  preOrderInstallment,
  offer,
  commercialProduct,
  variation,
  casting,
  miniatureBrand,
  scale,
  appUser,
  role,
  userRole,
  sellerProfile,
  commercialInventory,
  inventoryMovement,
  userSubscription,
  subscriptionPlan,
} from '../../database/schema';
import {
  CreatePreOrderReservationInput,
  PreOrdersQuery,
  SettleInstallmentInput,
  UpdateInstallmentInput,
  UpdatePreOrderStatusInput,
  UpdatePreOrderFulfillmentInput,
  CollectorsStatusQuery,
  CreateManualPreOrderInput,
  ImportPreOrdersBatchInput,
} from './pre-orders.schemas';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class PreOrdersRepository {
  async findOfferForPreOrder(offerId: string) {
    const [row] = await db
      .select({
        id: offer.id,
        sellerId: offer.sellerId,
        variationId: commercialProduct.variationId,
        title: offer.title,
        price: offer.price,
        status: offer.status,
        isPreOrder: offer.isPreOrder,
        preOrderEstimatedArrival: offer.preOrderEstimatedArrival,
        hasArrived: offer.hasArrived,
        arrivedAt: offer.arrivedAt,
        allowDepositAndBalance: offer.allowDepositAndBalance,
        depositAmount: offer.depositAmount,
        allowFullOnArrival: offer.allowFullOnArrival,
        allowInstallments: offer.allowInstallments,
        maxInstallments: offer.maxInstallments,
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
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
        seller: {
          id: sellerProfile.id,
          userId: sellerProfile.userId,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
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

    return row || null;
  }

  async checkBuyerOverdueInstallments(buyerId: string) {
    const [overdue] = await db
      .select({
        id: preOrderInstallment.id,
        installmentNumber: preOrderInstallment.installmentNumber,
        amount: preOrderInstallment.amount,
        dueDate: preOrderInstallment.dueDate,
        daysOverdue: sql<number>`(CURRENT_DATE - ${preOrderInstallment.dueDate})::int`,
        preOrderNumber: preOrder.preOrderNumber,
        sellerStore: sellerProfile.storeName,
      })
      .from(preOrderInstallment)
      .innerJoin(preOrder, eq(preOrderInstallment.preOrderId, preOrder.id))
      .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
      .where(
        and(
          eq(preOrder.buyerId, buyerId),
          sql`${preOrder.status} != 'CANCELLED'`,
          sql`(${preOrderInstallment.status} != 'PAID' OR ${preOrderInstallment.paidAt} IS NULL)`,
          sql`${preOrderInstallment.dueDate} IS NOT NULL`,
          sql`${preOrderInstallment.dueDate} < CURRENT_DATE - INTERVAL '10 days'`
        )
      )
      .orderBy(asc(preOrderInstallment.dueDate))
      .limit(1);

    if (overdue) {
      return {
        isOverdueGreaterThan10Days: true,
        daysOverdue: overdue.daysOverdue,
        dueDate: overdue.dueDate,
        amount: overdue.amount,
        preOrderNumber: overdue.preOrderNumber,
        sellerStore: overdue.sellerStore,
      };
    }

    return {
      isOverdueGreaterThan10Days: false,
      daysOverdue: 0,
      dueDate: null,
      amount: null,
      preOrderNumber: null,
      sellerStore: null,
    };
  }

  async createReservation(buyerId: string, targetOffer: any, input: CreatePreOrderReservationInput) {
    return db.transaction(async (tx) => {
      const quantity = Math.max(1, input.quantity || 1);

      // 0. Quota check: ensure pre-order units are still available
      const availableUnits = targetOffer.inventory?.available ?? 0;
      if (availableUnits <= 0) {
        throw new BadRequestError('As vagas / unidades deste lote de pré-venda estão 100% esgotadas.');
      }
      if (quantity > availableUnits) {
        throw new BadRequestError(
          `Quantidade solicitada (${quantity}) excede o limite de cotas disponíveis (${availableUnits}).`
        );
      }

      // 0.1 Check if buyer has any open installment overdue > 10 days in any pre-order across the platform
      const overdueCheck = await this.checkBuyerOverdueInstallments(buyerId);
      const requiresApproval = overdueCheck.isOverdueGreaterThan10Days;
      const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : 'RESERVED';
      const approvalReason = requiresApproval
        ? `Retida para aprovação: Colecionador possui parcela com ${overdueCheck.daysOverdue} dias de atraso (vencimento: ${overdueCheck.dueDate}, valor: R$ ${overdueCheck.amount}) em pré-venda na loja ${overdueCheck.sellerStore || 'da plataforma'}.`
        : null;

      let totalAmount = (parseFloat(targetOffer.price) || 0) * quantity;
      if (input.customInstallments && input.customInstallments.length > 0) {
        totalAmount = input.customInstallments.reduce((acc, ci) => acc + (parseFloat(ci.amount) || 0), 0);
      }
      const preOrderNumber = `PRE-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Insert PreOrder
      const [newPreOrder] = await tx
        .insert(preOrder)
        .values({
          preOrderNumber,
          buyerId,
          sellerId: targetOffer.sellerId,
          offerId: targetOffer.id,
          variationId: targetOffer.variationId,
          status: initialStatus,
          paymentPlan: input.paymentPlan,
          quantity,
          totalAmount: totalAmount.toFixed(2),
          paidAmount: '0.00',
          remainingAmount: totalAmount.toFixed(2),
          estimatedArrival: targetOffer.preOrderEstimatedArrival || null,
          hasArrived: targetOffer.hasArrived || false,
          arrivedAt: targetOffer.arrivedAt || null,
          fulfillmentStatus: 'NA_GARAGEM',
          requiresApproval,
          approvalReason,
          notes: input.notes || null,
        })
        .returning();

      if (!newPreOrder) {
        throw new Error('Falha ao criar registro de pré-venda');
      }

      // 2. Deduct requested quantity from pre-order quota/inventory
      const currentOnHand = targetOffer.inventory?.onHand ?? quantity;
      const newOnHand = Math.max(0, currentOnHand - quantity);

      if (targetOffer.inventory?.id) {
        await tx
          .update(commercialInventory)
          .set({
            onHand: newOnHand,
            updatedAt: new Date(),
          })
          .where(eq(commercialInventory.id, targetOffer.inventory.id));

        await tx.insert(inventoryMovement).values({
          inventoryId: targetOffer.inventory.id,
          type: 'STOCK_OUT',
          quantity,
          reason: `Reserva de ${quantity} unidade(s) da pré-venda ${preOrderNumber}`,
        });
      }

      // 3. If remaining available quota reached 0, automatically close and mark offer SOLD_OUT
      if (newOnHand <= 0) {
        await tx
          .update(offer)
          .set({
            status: 'SOLD_OUT',
            updatedAt: new Date(),
          })
          .where(eq(offer.id, targetOffer.id));
      }

      // 4. Generate Installments Schedule
      const installmentsToInsert: Array<{
        preOrderId: string;
        installmentNumber: number;
        totalInstallments: number;
        description: string;
        amount: string;
        dueDate: string | null;
        status: string;
      }> = [];

      const today = new Date();

      if (input.customInstallments && input.customInstallments.length > 0) {
        const totalInsts = input.customInstallments.length;
        for (const ci of input.customInstallments) {
          installmentsToInsert.push({
            preOrderId: newPreOrder.id,
            installmentNumber: ci.installmentNumber,
            totalInstallments: totalInsts,
            description: ci.description,
            amount: parseFloat(ci.amount).toFixed(2),
            dueDate: ci.dueDate || null,
            status: 'PENDING',
          });
        }
      } else if (input.paymentPlan === 'DEPOSIT_AND_BALANCE') {
        const depositPerUnit = targetOffer.depositAmount
          ? parseFloat(targetOffer.depositAmount)
          : Math.round((parseFloat(targetOffer.price) || 0) * 0.3 * 100) / 100;
        const depositTotal = depositPerUnit * quantity;
        const depositFixed = Math.min(depositTotal, totalAmount);
        const balance = Math.max(0, Math.round((totalAmount - depositFixed) * 100) / 100);

        // Installment 1: Deposit (due now)
        installmentsToInsert.push({
          preOrderId: newPreOrder.id,
          installmentNumber: 1,
          totalInstallments: 2,
          description: `Sinal de Entrada (${quantity} un. - Reserva)`,
          amount: depositFixed.toFixed(2),
          dueDate: today.toISOString().split('T')[0] ?? null,
          status: 'PENDING',
        });

        // Installment 2: Balance on Arrival (due on arrival, ex: 60 days ahead)
        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() + 60);
        installmentsToInsert.push({
          preOrderId: newPreOrder.id,
          installmentNumber: 2,
          totalInstallments: 2,
          description: `Saldo Final na Chegada (${quantity} un.)`,
          amount: balance.toFixed(2),
          dueDate: arrivalDate.toISOString().split('T')[0] ?? null,
          status: 'PENDING',
        });
      } else if (input.paymentPlan === 'FULL_ON_ARRIVAL') {
        // Single installment due on arrival
        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() + 60);

        installmentsToInsert.push({
          preOrderId: newPreOrder.id,
          installmentNumber: 1,
          totalInstallments: 1,
          description: `Pagamento Integral na Chegada (${quantity} un.)`,
          amount: totalAmount.toFixed(2),
          dueDate: arrivalDate.toISOString().split('T')[0] ?? null,
          status: 'PENDING',
        });
      } else if (input.paymentPlan === 'INSTALLMENTS') {
        const count = Math.max(1, Math.min(input.installmentsCount || 1, targetOffer.maxInstallments || 10));
        const dueDay = Math.min(Math.max(input.dueDateDay || 10, 1), 31);
        const depositPerUnit = targetOffer.depositAmount ? parseFloat(targetOffer.depositAmount) : 0;
        const depositAmountNum = depositPerUnit * quantity;
        const hasCustomFirst = depositAmountNum > 0 && count > 1 && depositAmountNum < totalAmount;

        let firstAmount = 0;
        let remainingBase = 0;
        let lastRemainder = 0;

        if (hasCustomFirst) {
          firstAmount = depositAmountNum;
          const remainingTotal = Math.round((totalAmount - firstAmount) * 100) / 100;
          const remainingCount = count - 1;
          remainingBase = Math.floor((remainingTotal / remainingCount) * 100) / 100;
          const remainingSumBeforeLast = Math.round(remainingBase * (remainingCount - 1) * 100) / 100;
          lastRemainder = Math.round((remainingTotal - remainingSumBeforeLast) * 100) / 100;
        } else {
          const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
          const remainder = Math.round((totalAmount - baseAmount * count) * 100) / 100;
          firstAmount = baseAmount + remainder;
          remainingBase = baseAmount;
          lastRemainder = baseAmount;
        }

        const now = new Date();
        const baseYear = now.getFullYear();
        const baseMonth = now.getMonth();

        for (let i = 1; i <= count; i++) {
          let installmentAmount = 0;
          if (i === 1) {
            installmentAmount = firstAmount;
          } else if (i === count && hasCustomFirst) {
            installmentAmount = lastRemainder;
          } else {
            installmentAmount = remainingBase;
          }

          const targetTargetMonth = baseMonth + i;
          const targetYear = baseYear + Math.floor(targetTargetMonth / 12);
          const normalizedMonth = ((targetTargetMonth % 12) + 12) % 12;
          const maxDaysInMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
          const clampedDay = Math.min(dueDay, maxDaysInMonth);
          const dueDateStr = `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

          installmentsToInsert.push({
            preOrderId: newPreOrder.id,
            installmentNumber: i,
            totalInstallments: count,
            description: i === 1 && hasCustomFirst ? '1ª Parcela (Entrada)' : `Parcela ${i} de ${count}`,
            amount: installmentAmount.toFixed(2),
            dueDate: dueDateStr,
            status: 'PENDING',
          });
        }
      }

      const createdInstallments = await tx
        .insert(preOrderInstallment)
        .values(installmentsToInsert as any)
        .returning();

      return {
        ...newPreOrder,
        installments: createdInstallments,
      };
    });
  }

  async listSellerPreOrders(sellerId: string, query?: PreOrdersQuery) {
    const conditions = [eq(preOrder.sellerId, sellerId)];

    if (query?.status) {
      conditions.push(eq(preOrder.status, query.status));
    }

    const preOrders = await db
      .select({
        id: preOrder.id,
        offerId: preOrder.offerId,
        preOrderNumber: preOrder.preOrderNumber,
        status: preOrder.status,
        paymentPlan: preOrder.paymentPlan,
        quantity: preOrder.quantity,
        totalAmount: preOrder.totalAmount,
        paidAmount: preOrder.paidAmount,
        remainingAmount: preOrder.remainingAmount,
        estimatedArrival: preOrder.estimatedArrival,
        hasArrived: preOrder.hasArrived,
        arrivedAt: preOrder.arrivedAt,
        fulfillmentStatus: preOrder.fulfillmentStatus,
        requiresApproval: preOrder.requiresApproval,
        approvalReason: preOrder.approvalReason,
        approvedAt: preOrder.approvedAt,
        rejectedAt: preOrder.rejectedAt,
        rejectionReason: preOrder.rejectionReason,
        notes: preOrder.notes,
        createdAt: preOrder.createdAt,
        updatedAt: preOrder.updatedAt,
        buyer: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          whatsapp: appUser.whatsapp,
        },
        variation: {
          id: variation.id,
          name: variation.name,
          photoUrl: variation.photoUrl,
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
      })
      .from(preOrder)
      .innerJoin(appUser, eq(preOrder.buyerId, appUser.id))
      .innerJoin(variation, eq(preOrder.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(and(...conditions))
      .orderBy(desc(preOrder.createdAt));

    if (preOrders.length === 0) return [];

    // Fetch all installments for these pre-orders
    const preOrderIds = preOrders.map((p) => p.id);
    const installments = await db
      .select()
      .from(preOrderInstallment)
      .where(inArray(preOrderInstallment.preOrderId, preOrderIds))
      .orderBy(asc(preOrderInstallment.installmentNumber));

    const todayStr = new Date().toISOString().split('T')[0] ?? '';

    return preOrders.map((po) => {
      const poInstallments = installments
        .filter((inst) => inst.preOrderId === po.id)
        .map((inst) => {
          const isOverdue = inst.status === 'PENDING' && inst.dueDate && inst.dueDate < todayStr;
          return {
            ...inst,
            isOverdue,
            status: isOverdue ? 'OVERDUE' : inst.status,
          };
        });

      return {
        ...po,
        installments: poInstallments,
      };
    });
  }

  async listBuyerPreOrders(buyerId: string) {
    const preOrders = await db
      .select({
        id: preOrder.id,
        offerId: preOrder.offerId,
        preOrderNumber: preOrder.preOrderNumber,
        status: preOrder.status,
        paymentPlan: preOrder.paymentPlan,
        quantity: preOrder.quantity,
        totalAmount: preOrder.totalAmount,
        paidAmount: preOrder.paidAmount,
        remainingAmount: preOrder.remainingAmount,
        estimatedArrival: preOrder.estimatedArrival,
        hasArrived: preOrder.hasArrived,
        arrivedAt: preOrder.arrivedAt,
        fulfillmentStatus: preOrder.fulfillmentStatus,
        requiresApproval: preOrder.requiresApproval,
        approvalReason: preOrder.approvalReason,
        notes: preOrder.notes,
        createdAt: preOrder.createdAt,
        seller: {
          id: sellerProfile.id,
          storeName: sellerProfile.storeName,
          slug: sellerProfile.slug,
          city: sellerProfile.city,
          state: sellerProfile.state,
        },
        variation: {
          id: variation.id,
          name: variation.name,
          photoUrl: variation.photoUrl,
          brandName: miniatureBrand.name,
          castingName: casting.name,
        },
      })
      .from(preOrder)
      .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
      .innerJoin(variation, eq(preOrder.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(preOrder.buyerId, buyerId))
      .orderBy(desc(preOrder.createdAt));

    if (preOrders.length === 0) return [];

    const preOrderIds = preOrders.map((p) => p.id);
    const installments = await db
      .select()
      .from(preOrderInstallment)
      .where(inArray(preOrderInstallment.preOrderId, preOrderIds))
      .orderBy(asc(preOrderInstallment.installmentNumber));

    const todayStr = new Date().toISOString().split('T')[0] ?? '';

    return preOrders.map((po) => {
      const poInstallments = installments
        .filter((inst) => inst.preOrderId === po.id)
        .map((inst) => ({
          ...inst,
          isOverdue: inst.status === 'PENDING' && inst.dueDate && inst.dueDate < todayStr,
        }));

      return {
        ...po,
        installments: poInstallments,
      };
    });
  }

  async findPreOrderById(preOrderId: string) {
    const [row] = await db
      .select({
        id: preOrder.id,
        sellerId: preOrder.sellerId,
        buyerId: preOrder.buyerId,
        status: preOrder.status,
        totalAmount: preOrder.totalAmount,
        paidAmount: preOrder.paidAmount,
        remainingAmount: preOrder.remainingAmount,
      })
      .from(preOrder)
      .where(eq(preOrder.id, preOrderId))
      .limit(1);

    return row || null;
  }

  async settleInstallment(
    preOrderId: string,
    installmentId: string,
    sellerUserId: string,
    input: SettleInstallmentInput
  ) {
    return db.transaction(async (tx) => {
      // 1. Verify pre-order and seller ownership
      const [po] = await tx
        .select({
          id: preOrder.id,
          sellerId: preOrder.sellerId,
          totalAmount: preOrder.totalAmount,
          status: preOrder.status,
          sellerUserId: sellerProfile.userId,
        })
        .from(preOrder)
        .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
        .where(eq(preOrder.id, preOrderId))
        .limit(1);

      if (!po) {
        throw new NotFoundError('Pré-venda não encontrada');
      }

      if (po.sellerUserId !== sellerUserId) {
        throw new BadRequestError('Você não tem permissão para gerenciar esta pré-venda');
      }

      // 2. Verify installment
      const [inst] = await tx
        .select()
        .from(preOrderInstallment)
        .where(and(eq(preOrderInstallment.id, installmentId), eq(preOrderInstallment.preOrderId, preOrderId)))
        .limit(1);

      if (!inst) {
        throw new NotFoundError('Parcela não encontrada');
      }

      if (inst.status === 'PAID') {
        throw new BadRequestError('Esta parcela já se encontra quitada');
      }

      const paidAmount = input.paidAmount ? parseFloat(input.paidAmount) : parseFloat(inst.amount);
      const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

      // 3. Update Installment
      const [updatedInst] = await tx
        .update(preOrderInstallment)
        .set({
          status: 'PAID',
          paidAmount: paidAmount.toFixed(2),
          paidAt,
          paymentMethod: input.paymentMethod || 'PIX',
          settledBy: sellerUserId,
          notes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(preOrderInstallment.id, installmentId))
        .returning();

      // 4. Recalculate PreOrder totals
      const allInsts = await tx
        .select({
          status: preOrderInstallment.status,
          amount: preOrderInstallment.amount,
          paidAmount: preOrderInstallment.paidAmount,
        })
        .from(preOrderInstallment)
        .where(eq(preOrderInstallment.preOrderId, preOrderId));

      let newPaidTotal = 0;
      let allPaid = true;

      for (const item of allInsts) {
        if (item.status === 'PAID') {
          newPaidTotal += parseFloat(item.paidAmount || item.amount);
        } else {
          allPaid = false;
        }
      }

      const totalAmount = parseFloat(po.totalAmount);
      const remaining = Math.max(0, totalAmount - newPaidTotal);

      // Auto update status if fully paid and arrived
      let newStatus = po.status;
      if (allPaid && (po.status === 'ARRIVED' || po.status === 'AWAITING_ARRIVAL')) {
        newStatus = 'READY_FOR_DISPATCH';
      }

      const [updatedPreOrder] = await tx
        .update(preOrder)
        .set({
          paidAmount: newPaidTotal.toFixed(2),
          remainingAmount: remaining.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(preOrder.id, preOrderId))
        .returning();

      return {
        preOrder: updatedPreOrder,
        installment: updatedInst,
      };
    });
  }

  async updateInstallment(
    preOrderId: string,
    installmentId: string,
    sellerUserId: string,
    input: UpdateInstallmentInput
  ) {
    return db.transaction(async (tx) => {
      const [po] = await tx
        .select({
          id: preOrder.id,
          sellerId: preOrder.sellerId,
          totalAmount: preOrder.totalAmount,
          sellerUserId: sellerProfile.userId,
        })
        .from(preOrder)
        .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
        .where(eq(preOrder.id, preOrderId))
        .limit(1);

      if (!po || po.sellerUserId !== sellerUserId) {
        throw new NotFoundError('Pré-venda não encontrada ou não pertence a este vendedor');
      }

      const [inst] = await tx
        .select()
        .from(preOrderInstallment)
        .where(and(eq(preOrderInstallment.id, installmentId), eq(preOrderInstallment.preOrderId, preOrderId)))
        .limit(1);

      if (!inst) {
        throw new NotFoundError('Parcela não encontrada');
      }

      if (inst.status === 'PAID') {
        throw new BadRequestError('Não é possível alterar uma parcela que já se encontra quitada');
      }

      const [updatedInst] = await tx
        .update(preOrderInstallment)
        .set({
          dueDate: input.dueDate !== undefined ? input.dueDate : inst.dueDate,
          amount: input.amount !== undefined ? parseFloat(input.amount).toFixed(2) : inst.amount,
          description: input.description !== undefined ? input.description : inst.description,
          updatedAt: new Date(),
        })
        .where(eq(preOrderInstallment.id, installmentId))
        .returning();

      // Recalculate PreOrder total and remaining amounts if amount was adjusted
      if (input.amount !== undefined) {
        const allInsts = await tx
          .select({
            status: preOrderInstallment.status,
            amount: preOrderInstallment.amount,
            paidAmount: preOrderInstallment.paidAmount,
          })
          .from(preOrderInstallment)
          .where(eq(preOrderInstallment.preOrderId, preOrderId));

        let newTotal = 0;
        let newPaid = 0;
        for (const item of allInsts) {
          const itemAmount = parseFloat(item.amount);
          newTotal += itemAmount;
          if (item.status === 'PAID') {
            newPaid += parseFloat(item.paidAmount || item.amount);
          }
        }
        const remaining = Math.max(0, newTotal - newPaid);

        await tx
          .update(preOrder)
          .set({
            totalAmount: newTotal.toFixed(2),
            paidAmount: newPaid.toFixed(2),
            remainingAmount: remaining.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(preOrder.id, preOrderId));
      }

      return updatedInst;
    });
  }

  async updatePreOrderStatus(preOrderId: string, sellerUserId: string, input: UpdatePreOrderStatusInput) {
    return db.transaction(async (tx) => {
      const [po] = await tx
        .select({
          id: preOrder.id,
          offerId: preOrder.offerId,
          status: preOrder.status,
          sellerUserId: sellerProfile.userId,
        })
        .from(preOrder)
        .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
        .where(eq(preOrder.id, preOrderId))
        .limit(1);

      if (!po || po.sellerUserId !== sellerUserId) {
        throw new NotFoundError('Pré-venda não encontrada ou não pertence a este vendedor');
      }

      // If status changed to CANCELLED from an active reservation, return 1 unit to inventory
      if (input.status === 'CANCELLED' && po.status !== 'CANCELLED') {
        const [inv] = await tx
          .select()
          .from(commercialInventory)
          .where(eq(commercialInventory.offerId, po.offerId))
          .limit(1);

        if (inv) {
          await tx
            .update(commercialInventory)
            .set({
              onHand: inv.onHand + 1,
              updatedAt: new Date(),
            })
            .where(eq(commercialInventory.id, inv.id));

          await tx.insert(inventoryMovement).values({
            inventoryId: inv.id,
            type: 'STOCK_IN',
            quantity: 1,
            reason: `Cancelamento da pré-venda ${preOrderId}`,
          });

          // If offer was SOLD_OUT, re-open it to ACTIVE
          await tx
            .update(offer)
            .set({
              status: 'ACTIVE',
              updatedAt: new Date(),
            })
            .where(and(eq(offer.id, po.offerId), eq(offer.status, 'SOLD_OUT')));
        }
      }

      const [updated] = await tx
        .update(preOrder)
        .set({
          status: input.status,
          notes: input.notes !== undefined ? input.notes : undefined,
          updatedAt: new Date(),
        })
        .where(eq(preOrder.id, preOrderId))
        .returning();

      return updated;
    });
  }

  async getSellerPreOrdersReport(sellerId: string) {
    const list = await this.listSellerPreOrders(sellerId);

    let totalContracted = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    const flatReportRows: Array<{
      preOrderNumber: string;
      createdAt: string;
      status: string;
      paymentPlan: string;
      quantity: number;
      totalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      estimatedArrival: string | null;
      hasArrived: boolean;
      arrivedAt: string | null;
      fulfillmentStatus: string;
      buyerName: string;
      buyerEmail: string;
      buyerWhatsapp: string | null;
      miniatureName: string;
      brandName: string | null;
      installmentNumber: number;
      totalInstallments: number;
      installmentDescription: string;
      installmentAmount: number;
      dueDate: string | null;
      installmentStatus: string;
      paidAt: string | null;
      paidAmountInst: number | null;
      paymentMethod: string | null;
      notes: string | null;
    }> = [];

    for (const po of list) {
      const poTotal = parseFloat(po.totalAmount) || 0;
      const poPaid = parseFloat(po.paidAmount) || 0;
      const poRemaining = parseFloat(po.remainingAmount) || 0;

      totalContracted += poTotal;
      totalPaid += poPaid;
      totalRemaining += poRemaining;

      for (const inst of po.installments) {
        const instAmount = parseFloat(inst.amount) || 0;
        if (inst.isOverdue) {
          overdueCount += 1;
          overdueAmount += instAmount;
        }

        flatReportRows.push({
          preOrderNumber: po.preOrderNumber,
          createdAt: new Date(po.createdAt).toLocaleDateString('pt-BR'),
          status: po.status,
          paymentPlan: po.paymentPlan,
          quantity: po.quantity || 1,
          totalAmount: poTotal,
          paidAmount: poPaid,
          remainingAmount: poRemaining,
          estimatedArrival: po.estimatedArrival,
          hasArrived: po.hasArrived,
          arrivedAt: po.arrivedAt ? new Date(po.arrivedAt).toLocaleDateString('pt-BR') : null,
          fulfillmentStatus: po.fulfillmentStatus === 'NA_GARAGEM' ? 'Na Garagem' : 'Entregue',
          buyerName: po.buyer.name,
          buyerEmail: po.buyer.email,
          buyerWhatsapp: po.buyer.whatsapp,
          miniatureName: po.variation.name,
          brandName: po.variation.brandName,
          installmentNumber: inst.installmentNumber,
          totalInstallments: inst.totalInstallments,
          installmentDescription: inst.description,
          installmentAmount: instAmount,
          dueDate: inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('pt-BR') : 'Na Chegada',
          installmentStatus: inst.status,
          paidAt: inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('pt-BR') : null,
          paidAmountInst: inst.paidAmount ? parseFloat(inst.paidAmount) : null,
          paymentMethod: inst.paymentMethod || null,
          notes: inst.notes || null,
        });
      }
    }

    return {
      metrics: {
        totalContracted: Math.round(totalContracted * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalRemaining: Math.round(totalRemaining * 100) / 100,
        overdueCount,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        totalPreOrders: list.length,
      },
      rows: flatReportRows,
    };
  }

  async getSellerPreOrdersDashboard(sellerId: string, filter: 'ALL' | 'OPEN' | 'CLOSED' | 'ARRIVED' = 'ALL') {
    // 1. Fetch all pre-order offers created by this seller
    const offers = await db
      .select({
        id: offer.id,
        sellerId: offer.sellerId,
        variationId: commercialProduct.variationId,
        title: offer.title,
        price: offer.price,
        status: offer.status,
        isPreOrder: offer.isPreOrder,
        preOrderEstimatedArrival: offer.preOrderEstimatedArrival,
        hasArrived: offer.hasArrived,
        arrivedAt: offer.arrivedAt,
        createdAt: offer.createdAt,
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
      .where(and(eq(offer.sellerId, sellerId), eq(offer.isPreOrder, true)))
      .orderBy(desc(offer.createdAt));

    // 2. Fetch all reservations with buyer info & installments for this seller
    const allReservations = await this.listSellerPreOrders(sellerId);

    // 3. Map reservations and calculate metrics per campaign
    let openAndAvailableCount = 0;
    let closedQuotaFilledCount = 0;
    let arrivedCount = 0;
    let totalReservations = allReservations.length;
    let totalContracted = 0;
    let inGarageCount = 0;
    let deliveredCount = 0;

    for (const r of allReservations) {
      totalContracted += parseFloat(r.totalAmount) || 0;
      if (r.fulfillmentStatus === 'NA_GARAGEM') inGarageCount += 1;
      if (r.fulfillmentStatus === 'ENTREGUE') deliveredCount += 1;
    }

    const campaigns = offers.map((off) => {
      const reservations = allReservations.filter((r) => r.offerId === off.id);
      const reservedCount = reservations.reduce((acc, r) => acc + (r.quantity || 1), 0);
      const availableStock = Math.max(0, off.inventory?.available ?? 0);
      const totalQuota = availableStock + reservedCount;

      const isArrived = off.hasArrived === true;
      const isOpenAndAvailable = !isArrived && availableStock > 0 && off.status === 'ACTIVE';
      const isClosedQuotaFilled = !isArrived && (availableStock <= 0 || off.status === 'SOLD_OUT');

      if (isArrived) arrivedCount += 1;
      else if (isOpenAndAvailable) openAndAvailableCount += 1;
      else if (isClosedQuotaFilled) closedQuotaFilledCount += 1;

      return {
        id: off.id,
        offerId: off.id,
        title: off.title,
        price: off.price,
        status: off.status,
        isPreOrder: off.isPreOrder,
        preOrderEstimatedArrival: off.preOrderEstimatedArrival,
        hasArrived: off.hasArrived,
        arrivedAt: off.arrivedAt,
        totalQuota,
        reservedCount,
        availableStock,
        isOpenAndAvailable,
        isClosedQuotaFilled,
        isClosedByQuota: isClosedQuotaFilled,
        isArrived,
        variation: off.variation,
        createdAt: off.createdAt,
        reservations,
      };
    });

    let filteredCampaigns = campaigns;
    if (filter === 'OPEN') {
      filteredCampaigns = campaigns.filter((c) => c.isOpenAndAvailable);
    } else if (filter === 'CLOSED') {
      filteredCampaigns = campaigns.filter((c) => c.isClosedQuotaFilled);
    } else if (filter === 'ARRIVED') {
      filteredCampaigns = campaigns.filter((c) => c.isArrived);
    }

    return {
      metrics: {
        openAndAvailableCount,
        closedQuotaFilledCount,
        closedByQuotaCount: closedQuotaFilledCount,
        arrivedCount,
        totalCampaigns: campaigns.length,
        totalReservations,
        totalContracted: Math.round(totalContracted * 100) / 100,
        inGarageCount,
        deliveredCount,
      },
      campaigns: filteredCampaigns,
    };
  }

  async markCampaignArrival(offerId: string, sellerUserId: string, arrivedAtInput?: string | null) {
    return db.transaction(async (tx) => {
      const [targetOffer] = await tx
        .select({
          id: offer.id,
          sellerId: offer.sellerId,
          sellerUserId: sellerProfile.userId,
        })
        .from(offer)
        .innerJoin(sellerProfile, eq(offer.sellerId, sellerProfile.id))
        .where(eq(offer.id, offerId))
        .limit(1);

      if (!targetOffer || targetOffer.sellerUserId !== sellerUserId) {
        throw new NotFoundError('Oferta de pré-venda não encontrada ou não pertence a este vendedor');
      }

      const arrivalDate = arrivedAtInput ? new Date(arrivedAtInput) : new Date();

      // 1. Update Offer
      const [updatedOffer] = await tx
        .update(offer)
        .set({
          hasArrived: true,
          arrivedAt: arrivalDate,
          updatedAt: new Date(),
        })
        .where(eq(offer.id, offerId))
        .returning();

      // 2. Cascade arrival to all reservations of this offer
      await tx
        .update(preOrder)
        .set({
          hasArrived: true,
          arrivedAt: arrivalDate,
          status: sql`CASE WHEN ${preOrder.status} IN ('RESERVED', 'AWAITING_ARRIVAL') THEN 'ARRIVED' ELSE ${preOrder.status} END`,
          updatedAt: new Date(),
        })
        .where(eq(preOrder.offerId, offerId));

      return updatedOffer;
    });
  }

  async updatePreOrderFulfillment(
    preOrderId: string,
    sellerUserId: string,
    input: UpdatePreOrderFulfillmentInput
  ) {
    return db.transaction(async (tx) => {
      const [po] = await tx
        .select({
          id: preOrder.id,
          sellerUserId: sellerProfile.userId,
          status: preOrder.status,
        })
        .from(preOrder)
        .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
        .where(eq(preOrder.id, preOrderId))
        .limit(1);

      if (!po || po.sellerUserId !== sellerUserId) {
        throw new NotFoundError('Pré-venda não encontrada ou não pertence a este vendedor');
      }

      const updateData: any = {
        fulfillmentStatus: input.fulfillmentStatus,
        updatedAt: new Date(),
      };

      if (input.hasArrived !== undefined) {
        updateData.hasArrived = input.hasArrived;
      }
      if (input.arrivedAt !== undefined) {
        updateData.arrivedAt = input.arrivedAt ? new Date(input.arrivedAt) : null;
      }
      if (input.fulfillmentStatus === 'ENTREGUE' && po.status !== 'CANCELLED') {
        updateData.status = 'COMPLETED';
      }

      const [updated] = await tx
        .update(preOrder)
        .set(updateData)
        .where(eq(preOrder.id, preOrderId))
        .returning();

      return updated;
    });
  }

  async approveReservation(preOrderId: string, sellerUserId: string, notes?: string) {
    const [target] = await db
      .select({
        id: preOrder.id,
        sellerId: preOrder.sellerId,
        status: preOrder.status,
        notes: preOrder.notes,
        sellerUserId: sellerProfile.userId,
      })
      .from(preOrder)
      .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
      .where(eq(preOrder.id, preOrderId))
      .limit(1);

    if (!target) {
      throw new NotFoundError('Pré-venda não encontrada');
    }

    if (target.sellerUserId !== sellerUserId) {
      throw new BadRequestError('Você não tem permissão para gerenciar esta pré-venda');
    }

    if (target.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Esta pré-venda está com status '${target.status}' e não aguarda aprovação.`);
    }

    const updatedNotes = notes
      ? target.notes ? `${target.notes}\n[Aprovação]: ${notes}` : `[Aprovação]: ${notes}`
      : target.notes;

    const [updated] = await db
      .update(preOrder)
      .set({
        status: 'RESERVED',
        approvedAt: new Date(),
        approvedBy: sellerUserId,
        notes: updatedNotes,
        updatedAt: new Date(),
      })
      .where(eq(preOrder.id, preOrderId))
      .returning();

    return updated;
  }

  async rejectReservation(preOrderId: string, sellerUserId: string, reason: string) {
    return db.transaction(async (tx) => {
      const [target] = await tx
        .select({
          id: preOrder.id,
          sellerId: preOrder.sellerId,
          offerId: preOrder.offerId,
          quantity: preOrder.quantity,
          status: preOrder.status,
          notes: preOrder.notes,
          sellerUserId: sellerProfile.userId,
        })
        .from(preOrder)
        .innerJoin(sellerProfile, eq(preOrder.sellerId, sellerProfile.id))
        .where(eq(preOrder.id, preOrderId))
        .limit(1);

      if (!target) {
        throw new NotFoundError('Pré-venda não encontrada');
      }

      if (target.sellerUserId !== sellerUserId) {
        throw new BadRequestError('Você não tem permissão para gerenciar esta pré-venda');
      }

      if (target.status !== 'PENDING_APPROVAL') {
        throw new BadRequestError(`Esta pré-venda está com status '${target.status}' e não aguarda aprovação.`);
      }

      const updatedNotes = target.notes
        ? `${target.notes}\n[Recusa da Reserva]: ${reason}`
        : `[Recusa da Reserva]: ${reason}`;

      // 1. Update pre_order to CANCELLED with rejection reason
      const [updated] = await tx
        .update(preOrder)
        .set({
          status: 'CANCELLED',
          rejectedAt: new Date(),
          rejectionReason: reason,
          notes: updatedNotes,
          updatedAt: new Date(),
        })
        .where(eq(preOrder.id, preOrderId))
        .returning();

      // 2. Return inventory quantity
      const [inv] = await tx
        .select()
        .from(commercialInventory)
        .where(eq(commercialInventory.offerId, target.offerId))
        .limit(1);

      if (inv) {
        await tx
          .update(commercialInventory)
          .set({
            onHand: sql`${commercialInventory.onHand} + ${target.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(commercialInventory.id, inv.id));

        await tx.insert(inventoryMovement).values({
          inventoryId: inv.id,
          type: 'RESERVATION_CANCEL',
          quantity: target.quantity,
          reason: `Recusa da reserva pendente da pré-venda ${target.id}: ${reason}`,
        });
      }

      // 3. Re-activate offer if was SOLD_OUT
      await tx
        .update(offer)
        .set({
          status: 'ACTIVE',
          updatedAt: new Date(),
        })
        .where(and(eq(offer.id, target.offerId), eq(offer.status, 'SOLD_OUT')));

      return updated;
    });
  }

  async listCollectorsHealth(sellerId: string, query: CollectorsStatusQuery) {
    const scope = query.scope || 'my';
    const statusFilter = query.status || 'ALL';
    const search = query.search?.trim() || '';

    const rows = await db.execute(sql`
      WITH collector_stats AS (
        SELECT
          u.id AS collector_id,
          u.name AS name,
          u.email AS email,
          u.whatsapp AS phone,
          u.city AS city,
          u.state AS state,
          u.avatar_url AS avatar_url,
          COUNT(DISTINCT po.id)::int AS total_pre_orders_platform,
          COUNT(DISTINCT CASE WHEN po.seller_id = ${sellerId} THEN po.id END)::int AS total_pre_orders_seller,
          COUNT(poi.id) FILTER (WHERE po.status != 'CANCELLED' AND (poi.status != 'PAID' OR poi.paid_at IS NULL))::int AS open_installments_count,
          COALESCE(SUM(poi.amount) FILTER (WHERE po.status != 'CANCELLED' AND (poi.status != 'PAID' OR poi.paid_at IS NULL)), 0)::numeric AS total_open_amount,
          COUNT(poi.id) FILTER (
            WHERE po.status != 'CANCELLED' 
              AND (poi.status != 'PAID' OR poi.paid_at IS NULL)
              AND poi.due_date IS NOT NULL
              AND poi.due_date < CURRENT_DATE
          )::int AS overdue_installments_count,
          COALESCE(SUM(poi.amount) FILTER (
            WHERE po.status != 'CANCELLED' 
              AND (poi.status != 'PAID' OR poi.paid_at IS NULL)
              AND poi.due_date IS NOT NULL
              AND poi.due_date < CURRENT_DATE
          ), 0)::numeric AS total_overdue_amount,
          COALESCE(MAX(
            CASE 
              WHEN po.status != 'CANCELLED' AND (poi.status != 'PAID' OR poi.paid_at IS NULL) AND poi.due_date IS NOT NULL AND poi.due_date < CURRENT_DATE 
              THEN (CURRENT_DATE - poi.due_date)::int 
              ELSE 0 
            END
          ), 0)::int AS max_days_overdue,
          COUNT(DISTINCT CASE WHEN po.seller_id = ${sellerId} AND po.status = 'PENDING_APPROVAL' THEN po.id END)::int AS pending_approvals_with_seller
        FROM app_user u
        JOIN pre_order po ON po.buyer_id = u.id
        LEFT JOIN pre_order_installment poi ON poi.pre_order_id = po.id
        WHERE po.status != 'CANCELLED'
        GROUP BY u.id, u.name, u.email, u.whatsapp, u.city, u.state, u.avatar_url
      ),
      classified AS (
        SELECT 
          *,
          CASE
            WHEN max_days_overdue > 10 THEN 'RED'
            WHEN max_days_overdue > 0 THEN 'YELLOW'
            ELSE 'GREEN'
          END AS health_status
        FROM collector_stats
      )
      SELECT *
      FROM classified
      WHERE 
        (${scope} = 'all' OR total_pre_orders_seller > 0)
        AND (${statusFilter} = 'ALL' OR health_status = ${statusFilter})
        AND (${search} = '' OR name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'})
      ORDER BY 
        CASE 
          WHEN pending_approvals_with_seller > 0 THEN 0
          WHEN health_status = 'RED' THEN 1 
          WHEN health_status = 'YELLOW' THEN 2 
          ELSE 3 
        END,
        max_days_overdue DESC,
        name ASC
    `);

    const rawRows = (rows as any).rows || rows || [];

    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let totalPendingApprovals = 0;

    const items = rawRows.map((r: any) => {
      const healthStatus = r.health_status as 'GREEN' | 'YELLOW' | 'RED';
      if (healthStatus === 'GREEN') greenCount += 1;
      else if (healthStatus === 'YELLOW') yellowCount += 1;
      else if (healthStatus === 'RED') redCount += 1;

      const pendingCount = Number(r.pending_approvals_with_seller) || 0;
      totalPendingApprovals += pendingCount;

      return {
        collectorId: r.collector_id,
        name: r.name,
        email: r.email,
        phone: r.phone || null,
        whatsapp: r.phone || null,
        city: r.city || null,
        state: r.state || null,
        avatarUrl: r.avatar_url || null,
        totalPreOrdersPlatform: Number(r.total_pre_orders_platform) || 0,
        totalPreOrdersSeller: Number(r.total_pre_orders_seller) || 0,
        openInstallmentsCount: Number(r.open_installments_count) || 0,
        totalOpenAmount: parseFloat(r.total_open_amount) || 0,
        overdueInstallmentsCount: Number(r.overdue_installments_count) || 0,
        overdueInstallmentsAmount: parseFloat(r.total_overdue_amount) || 0,
        maxDaysOverdue: Number(r.max_days_overdue) || 0,
        pendingApprovalsWithSeller: pendingCount,
        healthStatus,

        // Frontend field mappings
        status: healthStatus,
        maxOverdueDays: Number(r.max_days_overdue) || 0,
        sellerPreOrdersCount: Number(r.total_pre_orders_seller) || 0,
        totalPreOrdersCount: Number(r.total_pre_orders_platform) || 0,
        openInstallmentsAmount: parseFloat(r.total_open_amount) || 0,
        pendingApprovalCount: pendingCount,
      };
    });

    const summaryData = {
      totalCollectors: items.length,
      greenCount,
      yellowCount,
      redCount,
      pendingApprovalsCount: totalPendingApprovals,
      totalPendingApprovals,
    };

    return {
      summary: summaryData,
      metrics: summaryData,
      collectors: items,
    };
  }

  async getCollectorFinancialSummary(sellerId: string, collectorId: string) {
    const [collector] = await db
      .select({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        whatsapp: appUser.whatsapp,
        avatarUrl: appUser.avatarUrl,
        city: appUser.city,
        state: appUser.state,
      })
      .from(appUser)
      .where(eq(appUser.id, collectorId))
      .limit(1);

    if (!collector) {
      throw new NotFoundError('Colecionador não encontrado');
    }

    const preOrders = await db.execute(sql`
      SELECT
        po.id,
        po.pre_order_number,
        po.status,
        po.payment_plan,
        po.quantity,
        po.total_amount,
        po.paid_amount,
        po.remaining_amount,
        po.created_at,
        po.requires_approval,
        po.approval_reason,
        po.seller_id,
        sp.store_name AS seller_store_name,
        (po.seller_id = ${sellerId}) AS is_my_store,
        v.id AS variation_id,
        v.name AS variation_name,
        v.photo_url AS photo_url,
        b.name AS brand_name
      FROM pre_order po
      JOIN seller_profile sp ON po.seller_id = sp.id
      JOIN variation v ON po.variation_id = v.id
      JOIN casting c ON v.casting_id = c.id
      JOIN miniature_brand b ON c.miniature_brand_id = b.id
      WHERE po.buyer_id = ${collectorId} AND po.status != 'CANCELLED'
      ORDER BY po.created_at DESC
    `);

    const rawPos = (preOrders as any).rows || preOrders || [];
    const poIds = rawPos.map((p: any) => p.id);

    let installmentsList: any[] = [];
    if (poIds.length > 0) {
      installmentsList = await db
        .select({
          id: preOrderInstallment.id,
          preOrderId: preOrderInstallment.preOrderId,
          installmentNumber: preOrderInstallment.installmentNumber,
          totalInstallments: preOrderInstallment.totalInstallments,
          description: preOrderInstallment.description,
          amount: preOrderInstallment.amount,
          dueDate: preOrderInstallment.dueDate,
          status: preOrderInstallment.status,
          paidAt: preOrderInstallment.paidAt,
          paidAmount: preOrderInstallment.paidAmount,
          paymentMethod: preOrderInstallment.paymentMethod,
          notes: preOrderInstallment.notes,
          daysOverdue: sql<number>`CASE WHEN (${preOrderInstallment.status} != 'PAID' OR ${preOrderInstallment.paidAt} IS NULL) AND ${preOrderInstallment.dueDate} IS NOT NULL AND ${preOrderInstallment.dueDate} < CURRENT_DATE THEN (CURRENT_DATE - ${preOrderInstallment.dueDate})::int ELSE 0 END`,
        })
        .from(preOrderInstallment)
        .where(inArray(preOrderInstallment.preOrderId, poIds))
        .orderBy(asc(preOrderInstallment.preOrderId), asc(preOrderInstallment.installmentNumber));
    }

    let maxDaysOverdue = 0;
    let totalOpenAmount = 0;
    let openInstallmentsCount = 0;

    for (const inst of installmentsList) {
      const days = Number(inst.daysOverdue) || 0;
      if (days > maxDaysOverdue) maxDaysOverdue = days;
      if (inst.status !== 'PAID' && !inst.paidAt) {
        openInstallmentsCount += 1;
        totalOpenAmount += parseFloat(inst.amount) || 0;
      }
    }

    let healthStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (maxDaysOverdue > 10) healthStatus = 'RED';
    else if (maxDaysOverdue > 0) healthStatus = 'YELLOW';

    const formattedPreOrders = rawPos.map((p: any) => {
      const pInsts = installmentsList
        .filter((inst) => inst.preOrderId === p.id)
        .map((inst) => ({
          id: inst.id,
          installmentNumber: inst.installmentNumber,
          totalInstallments: inst.totalInstallments,
          description: inst.description,
          amount: parseFloat(inst.amount) || 0,
          dueDate: inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : null,
          status: inst.status,
          paidAt: inst.paidAt,
          paidAmount: inst.paidAmount ? parseFloat(inst.paidAmount) : null,
          paymentMethod: inst.paymentMethod,
          notes: inst.notes,
          daysOverdue: Number(inst.daysOverdue) || 0,
          isOverdue: Number(inst.daysOverdue) > 0,
        }));

      return {
        id: p.id,
        preOrderNumber: p.pre_order_number,
        status: p.status,
        paymentPlan: p.payment_plan,
        quantity: p.quantity,
        totalAmount: parseFloat(p.total_amount) || 0,
        paidAmount: parseFloat(p.paid_amount) || 0,
        remainingAmount: parseFloat(p.remaining_amount) || 0,
        createdAt: p.created_at,
        requiresApproval: p.requires_approval,
        approvalReason: p.approval_reason,
        sellerStoreName: p.seller_store_name,
        isMyStore: p.is_my_store,
        isCurrentSeller: p.is_my_store,
        miniatureName: p.variation_name,
        variation: {
          id: p.variation_id,
          name: p.variation_name,
          photoUrl: p.photo_url,
          brandName: p.brand_name,
        },
        installments: pInsts,
      };
    });

    const flatInstallments = installmentsList.map((inst) => ({
      id: inst.id,
      preOrderId: inst.preOrderId,
      installmentNumber: inst.installmentNumber,
      totalInstallments: inst.totalInstallments,
      description: inst.description,
      amount: String(inst.amount),
      dueDate: inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : null,
      status: inst.status,
      paidAt: inst.paidAt,
      isOverdue: Number(inst.daysOverdue) > 0,
      daysOverdue: Number(inst.daysOverdue) || 0,
      isCurrentSeller: rawPos.find((p: any) => p.id === inst.preOrderId)?.is_my_store || false,
    }));

    return {
      collector: {
        id: collector.id,
        name: collector.name,
        email: collector.email,
        phone: collector.whatsapp || null,
        whatsapp: collector.whatsapp || null,
        avatarUrl: collector.avatarUrl || null,
        city: collector.city || null,
        state: collector.state || null,
        healthStatus,
        status: healthStatus,
        maxDaysOverdue,
        maxOverdueDays: maxDaysOverdue,
        totalOpenAmount: Math.round(totalOpenAmount * 100) / 100,
        openInstallmentsCount,
      },
      healthStatus,
      status: healthStatus,
      maxDaysOverdue,
      maxOverdueDays: maxDaysOverdue,
      preOrders: formattedPreOrders,
      installments: flatInstallments,
    };
  }

  // ============================================================================
  // MANUAL PRE-ORDERS & BATCH IMPORT
  // ============================================================================

  async findOrCreateCollector(
    tx: any,
    collectorInput: { name: string; email: string; whatsapp?: string | null }
  ) {
    const normEmail = collectorInput.email.trim().toLowerCase();
    const [existing] = await tx
      .select()
      .from(appUser)
      .where(eq(appUser.normalizedEmail, normEmail))
      .limit(1);

    if (existing) {
      if (collectorInput.whatsapp && !existing.whatsapp) {
        await tx
          .update(appUser)
          .set({ whatsapp: collectorInput.whatsapp.trim(), updatedAt: new Date() })
          .where(eq(appUser.id, existing.id));
        existing.whatsapp = collectorInput.whatsapp.trim();
      }
      return {
        user: existing,
        isNewUser: false,
        temporaryPassword: null as string | null,
      };
    }

    const defaultPassword = 'MiniHub@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [newUser] = await tx
      .insert(appUser)
      .values({
        name: collectorInput.name.trim(),
        email: collectorInput.email.trim(),
        normalizedEmail: normEmail,
        whatsapp: collectorInput.whatsapp?.trim() || null,
        passwordHash,
        status: 'ACTIVE',
        isCollectionPublic: true,
      })
      .returning();

    // Link COLLECTOR role
    const [collectorRole] = await tx
      .select()
      .from(role)
      .where(eq(role.code, 'COLLECTOR'))
      .limit(1);

    if (collectorRole) {
      await tx
        .insert(userRole)
        .values({
          userId: newUser.id,
          roleId: collectorRole.id,
        })
        .onConflictDoNothing();
    }

    // Link FREE (Starter) plan
    const [freePlan] = await tx
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.code, 'FREE'))
      .limit(1);

    if (freePlan) {
      await tx
        .insert(userSubscription)
        .values({
          userId: newUser.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          paymentMethod: 'FREE',
          startedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    return {
      user: newUser,
      isNewUser: true,
      temporaryPassword: defaultPassword,
    };
  }

  async findOrCreatePreOrderOffer(
    tx: any,
    sellerId: string,
    miniature: {
      name: string;
      brandName?: string | null;
      scaleDenominator?: number;
      photoUrl?: string | null;
      estimatedArrival?: string | null;
    },
    unitPrice: string
  ) {
    const rawBrandName = miniature.brandName?.trim() || 'Outros';
    const normBrand = rawBrandName.toLowerCase();

    let [foundBrand] = await tx
      .select()
      .from(miniatureBrand)
      .where(eq(miniatureBrand.normalizedName, normBrand))
      .limit(1);

    if (!foundBrand) {
      const [newBrand] = await tx
        .insert(miniatureBrand)
        .values({
          name: rawBrandName,
          normalizedName: normBrand,
          status: 'ACTIVE',
        })
        .returning();
      foundBrand = newBrand;
    }

    // Scale
    const denom = miniature.scaleDenominator || 64;
    let [foundScale] = await tx
      .select()
      .from(scale)
      .where(eq(scale.denominator, denom))
      .limit(1);

    if (!foundScale) {
      const [newScale] = await tx
        .insert(scale)
        .values({
          name: `1:${denom}`,
          numerator: 1,
          denominator: denom,
          normalizedValue: (1 / denom).toFixed(6),
          status: 'ACTIVE',
        })
        .returning();
      foundScale = newScale;
    }

    // Casting
    const rawName = miniature.name.trim();
    const normCasting = rawName.toLowerCase();
    let [foundCasting] = await tx
      .select()
      .from(casting)
      .where(
        and(
          eq(casting.miniatureBrandId, foundBrand.id),
          eq(casting.normalizedName, normCasting)
        )
      )
      .limit(1);

    if (!foundCasting) {
      const [newCasting] = await tx
        .insert(casting)
        .values({
          miniatureBrandId: foundBrand.id,
          name: rawName,
          normalizedName: normCasting,
          status: 'ACTIVE',
        })
        .returning();
      foundCasting = newCasting;
    }

    // Variation
    let [foundVariation] = await tx
      .select()
      .from(variation)
      .where(
        and(
          eq(variation.castingId, foundCasting.id),
          eq(variation.name, rawName)
        )
      )
      .limit(1);

    if (!foundVariation) {
      const [newVar] = await tx
        .insert(variation)
        .values({
          castingId: foundCasting.id,
          scaleId: foundScale?.id,
          name: rawName,
          photoUrl: miniature.photoUrl?.trim() || null,
          status: 'ACTIVE',
        })
        .returning();
      foundVariation = newVar;
    }

    // Commercial Product
    let [cp] = await tx
      .select()
      .from(commercialProduct)
      .where(eq(commercialProduct.variationId, foundVariation.id))
      .limit(1);

    if (!cp) {
      const [newCp] = await tx
        .insert(commercialProduct)
        .values({
          variationId: foundVariation.id,
          isActive: true,
        })
        .returning();
      cp = newCp;
    }

    // Offer
    let [targetOffer] = await tx
      .select()
      .from(offer)
      .where(
        and(
          eq(offer.commercialProductId, cp.id),
          eq(offer.sellerId, sellerId),
          eq(offer.isPreOrder, true)
        )
      )
      .limit(1);

    if (!targetOffer) {
      const [newOffer] = await tx
        .insert(offer)
        .values({
          commercialProductId: cp.id,
          sellerId,
          title: rawName,
          price: unitPrice,
          condition: 'LACRADO',
          status: 'ACTIVE',
          isPreOrder: true,
          preOrderEstimatedArrival: miniature.estimatedArrival || null,
          allowDepositAndBalance: true,
          allowFullOnArrival: true,
          allowInstallments: true,
          maxInstallments: 12,
          photos: miniature.photoUrl ? [miniature.photoUrl] : [],
        })
        .returning();

      await tx.insert(commercialInventory).values({
        offerId: newOffer.id,
        onHand: 100,
        reserved: 0,
        committed: 0,
      });

      targetOffer = newOffer;
    }

    return {
      offerId: targetOffer.id,
      variationId: foundVariation.id,
    };
  }

  async createManualPreOrder(
    sellerId: string,
    sellerStoreName: string,
    input: CreateManualPreOrderInput
  ) {
    return db.transaction(async (tx) => {
      // 1. Provision / get collector
      const { user: collector, isNewUser, temporaryPassword } =
        await this.findOrCreateCollector(tx, input.collector);

      // 2. Provision / get offer & variation
      const quantity = Math.max(1, input.miniature.quantity || 1);
      const totalAmountNum = parseFloat(input.financial.totalAmount);
      const unitPrice = (totalAmountNum / quantity).toFixed(2);

      const { offerId, variationId } = await this.findOrCreatePreOrderOffer(
        tx,
        sellerId,
        input.miniature,
        unitPrice
      );

      // 3. Compute paid and remaining amounts
      let paidAmountNum = 0;
      for (const inst of input.financial.installments) {
        if (inst.status === 'PAID') {
          const val = parseFloat(inst.settledAmount || inst.amount) || 0;
          paidAmountNum += val;
        }
      }

      const remainingAmountNum = Math.max(0, totalAmountNum - paidAmountNum);
      const isFullyPaid = remainingAmountNum <= 0.001;

      const preOrderNumber = `PRE-MAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      // 4. Insert pre_order
      const [newPreOrder] = await tx
        .insert(preOrder)
        .values({
          preOrderNumber,
          buyerId: collector.id,
          sellerId,
          offerId,
          variationId,
          status: isFullyPaid ? 'ARRIVED' : 'RESERVED',
          paymentPlan: input.financial.paymentPlan,
          quantity,
          totalAmount: totalAmountNum.toFixed(2),
          paidAmount: paidAmountNum.toFixed(2),
          remainingAmount: remainingAmountNum.toFixed(2),
          estimatedArrival: input.miniature.estimatedArrival || null,
          hasArrived: false,
          fulfillmentStatus: 'NA_GARAGEM',
          requiresApproval: false,
          notes: input.financial.notes || null,
        })
        .returning();

      if (!newPreOrder) {
        throw new Error('Falha ao criar registro de pré-venda');
      }

      // 5. Insert installments
      for (const inst of input.financial.installments) {
        const isPaid = inst.status === 'PAID';
        const paidAtDate = isPaid
          ? inst.paidAt
            ? new Date(inst.paidAt)
            : new Date()
          : null;
        const paidVal = isPaid ? (inst.settledAmount || inst.amount) : null;

        await tx.insert(preOrderInstallment).values({
          preOrderId: newPreOrder.id,
          installmentNumber: inst.installmentNumber,
          totalInstallments: inst.totalInstallments,
          amount: parseFloat(inst.amount).toFixed(2),
          dueDate: inst.dueDate.slice(0, 10),
          status: isPaid ? 'PAID' : 'PENDING',
          paidAt: paidAtDate,
          paidAmount: paidVal ? parseFloat(paidVal).toFixed(2) : null,
          paymentMethod: inst.paymentMethod || 'PIX',
          description:
            inst.description ||
            (inst.installmentNumber === 1 && isPaid
              ? '1ª Parcela (Sinal / Entrada)'
              : `Parcela ${inst.installmentNumber} de ${inst.totalInstallments}`),
          notes: inst.notes || null,
        });
      }

      // 6. Build WhatsApp share message
      let whatsappMessage = `Olá ${collector.name}! Sua pré-venda da miniatura *${input.miniature.name}* foi cadastrada na loja *${sellerStoreName}*!\n\n` +
        `📦 *Pedido:* ${preOrderNumber}\n` +
        `💰 *Valor Total:* R$ ${totalAmountNum.toFixed(2).replace('.', ',')}\n` +
        `✅ *Total Já Pago:* R$ ${paidAmountNum.toFixed(2).replace('.', ',')}\n` +
        `⏳ *Saldo Restante:* R$ ${remainingAmountNum.toFixed(2).replace('.', ',')}\n`;

      if (input.miniature.estimatedArrival) {
        whatsappMessage += `📅 *Previsão de Chegada:* ${input.miniature.estimatedArrival}\n`;
      }

      whatsappMessage += `\nPara acompanhar o status da sua miniatura e as datas de vencimento, acesse o MiniHub Car:\n` +
        `👉 https://minihubcar.com.br/login\n` +
        `👤 *E-mail:* ${collector.email}\n`;

      if (isNewUser && temporaryPassword) {
        whatsappMessage += `🔑 *Senha provisória:* ${temporaryPassword} (você pode alterá-la no seu perfil).\n`;
      }

      const cleanPhone = (collector.whatsapp || '').replace(/\D/g, '');
      const whatsappShareUrl = cleanPhone
        ? `https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${encodeURIComponent(whatsappMessage)}`
        : null;

      return {
        preOrder: newPreOrder,
        collector: {
          id: collector.id,
          name: collector.name,
          email: collector.email,
          whatsapp: collector.whatsapp,
          isNewUser,
          temporaryPassword,
        },
        financial: {
          totalAmount: totalAmountNum.toFixed(2),
          paidAmount: paidAmountNum.toFixed(2),
          remainingAmount: remainingAmountNum.toFixed(2),
          installmentsCount: input.financial.installments.length,
          paidInstallmentsCount: input.financial.installments.filter((i) => i.status === 'PAID').length,
          pendingInstallmentsCount: input.financial.installments.filter((i) => i.status === 'PENDING').length,
        },
        whatsappMessage,
        whatsappShareUrl,
      };
    });
  }

  async importPreOrdersBatch(
    sellerId: string,
    sellerStoreName: string,
    items: CreateManualPreOrderInput[]
  ) {
    const results: Array<{
      preOrderNumber: string;
      collectorName: string;
      collectorEmail: string;
      collectorWhatsapp: string | null;
      isNewUser: boolean;
      temporaryPassword: string | null;
      miniatureName: string;
      totalAmount: string;
      paidAmount: string;
      remainingAmount: string;
      whatsappShareUrl: string | null;
    }> = [];

    const errors: Array<{
      index: number;
      item: string;
      error: string;
    }> = [];

    let newCollectorsCount = 0;
    let totalContractedAmount = 0;
    let totalPaidAmount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      try {
        const res = await this.createManualPreOrder(sellerId, sellerStoreName, item);
        if (!res || !res.preOrder) continue;

        if (res.collector.isNewUser) {
          newCollectorsCount++;
        }
        totalContractedAmount += parseFloat(res.financial.totalAmount) || 0;
        totalPaidAmount += parseFloat(res.financial.paidAmount) || 0;

        results.push({
          preOrderNumber: res.preOrder.preOrderNumber,
          collectorName: res.collector.name,
          collectorEmail: res.collector.email,
          collectorWhatsapp: res.collector.whatsapp,
          isNewUser: res.collector.isNewUser,
          temporaryPassword: res.collector.temporaryPassword,
          miniatureName: item.miniature.name,
          totalAmount: res.financial.totalAmount,
          paidAmount: res.financial.paidAmount,
          remainingAmount: res.financial.remainingAmount,
          whatsappShareUrl: res.whatsappShareUrl,
        });
      } catch (err: any) {
        errors.push({
          index: i + 1,
          item: item?.miniature?.name || `Linha ${i + 1}`,
          error: err.message || 'Erro desconhecido ao processar item',
        });
      }
    }

    return {
      totalProcessed: items.length,
      successCount: results.length,
      errorCount: errors.length,
      newCollectorsCount,
      totalContractedAmount: totalContractedAmount.toFixed(2),
      totalPaidAmount: totalPaidAmount.toFixed(2),
      totalRemainingAmount: Math.max(0, totalContractedAmount - totalPaidAmount).toFixed(2),
      results,
      errors,
    };
  }
}


