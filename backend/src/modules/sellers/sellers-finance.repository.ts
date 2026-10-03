import { eq, and, ne, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  sellerProfile,
  order,
  orderItem,
  preOrder,
  preOrderInstallment,
  acquisition,
  acquisitionItem,
  collectionExemplar,
  variation,
  casting,
  miniatureBrand,
  appUser,
} from '../../database/schema';
import { SellerFinanceFilter } from './sellers-finance.schemas';

export class SellersFinanceRepository {
  async getFinancialReport(sellerId: string, userId: string, filter?: SellerFinanceFilter) {
    const todayStr: string = new Date().toISOString().split('T')[0] || '';
    const currentYearMonth: string = todayStr.slice(0, 7);

    // 1. Direct Sales (Orders)
    const directSalesQuery = db
      .select({
        id: orderItem.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        fulfillmentStatus: orderItem.fulfillmentStatus,
        createdAt: orderItem.createdAt,
        quantity: orderItem.quantity,
        unitPrice: orderItem.unitPrice,
        totalPrice: orderItem.totalPrice,
        variationSnapshot: orderItem.variationSnapshot,
        buyerId: appUser.id,
        buyerName: appUser.name,
        buyerEmail: appUser.email,
        buyerWhatsapp: appUser.whatsapp,
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .innerJoin(appUser, eq(order.userId, appUser.id))
      .where(and(eq(orderItem.sellerId, sellerId), ne(order.status, 'CANCELLED')))
      .orderBy(desc(orderItem.createdAt));

    const rawDirectSales = await directSalesQuery;

    // 2. Pre-orders with Variations and Installments
    const preOrdersQuery = db
      .select({
        id: preOrder.id,
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
        createdAt: preOrder.createdAt,
        buyerId: appUser.id,
        buyerName: appUser.name,
        buyerEmail: appUser.email,
        buyerWhatsapp: appUser.whatsapp,
        variationId: variation.id,
        variationName: variation.name,
        variationPhotoUrl: variation.photoUrl,
        brandName: miniatureBrand.name,
      })
      .from(preOrder)
      .innerJoin(appUser, eq(preOrder.buyerId, appUser.id))
      .innerJoin(variation, eq(preOrder.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(and(eq(preOrder.sellerId, sellerId), ne(preOrder.status, 'CANCELLED')))
      .orderBy(desc(preOrder.createdAt));

    const rawPreOrders = await preOrdersQuery;

    // Fetch installments for all pre-orders of this seller
    const preOrderIds = rawPreOrders.map((po) => po.id);
    let allInstallments: any[] = [];
    if (preOrderIds.length > 0) {
      allInstallments = await db
        .select()
        .from(preOrderInstallment)
        .where(sql`${preOrderInstallment.preOrderId} IN ${preOrderIds}`)
        .orderBy(asc(preOrderInstallment.installmentNumber));
    }

    const installmentsByPreOrder = new Map<string, any[]>();
    for (const inst of allInstallments) {
      const list = installmentsByPreOrder.get(inst.preOrderId) || [];
      list.push(inst);
      installmentsByPreOrder.set(inst.preOrderId, list);
    }

    // 3. Acquisitions / Inventory Costs (Registered by Seller's User)
    const acquisitionsQuery = db
      .select({
        id: acquisition.id,
        acquisitionType: acquisition.acquisitionType,
        acquisitionDate: acquisition.acquisitionDate,
        sourceName: acquisition.sourceName,
        notes: acquisition.notes,
        createdAt: acquisition.createdAt,
        itemId: acquisitionItem.id,
        quantity: acquisitionItem.quantity,
        unitCost: acquisitionItem.unitCost,
        totalCost: acquisitionItem.totalCost,
        variationName: variation.name,
        brandName: miniatureBrand.name,
      })
      .from(acquisition)
      .innerJoin(acquisitionItem, eq(acquisitionItem.acquisitionId, acquisition.id))
      .innerJoin(collectionExemplar, eq(acquisitionItem.exemplarId, collectionExemplar.id))
      .innerJoin(variation, eq(collectionExemplar.variationId, variation.id))
      .innerJoin(casting, eq(variation.castingId, casting.id))
      .innerJoin(miniatureBrand, eq(casting.miniatureBrandId, miniatureBrand.id))
      .where(eq(acquisition.userId, userId))
      .orderBy(desc(acquisition.acquisitionDate));

    const rawAcquisitions = await acquisitionsQuery;

    // Process Sales Data List
    const consolidatedSales: Array<{
      id: string;
      type: 'PRONTA_ENTREGA' | 'PRE_VENDA';
      referenceNumber: string;
      date: string;
      rawDate: string;
      buyerName: string;
      buyerEmail: string;
      buyerWhatsapp: string | null;
      miniatureName: string;
      brandName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      paidAmount: number;
      remainingAmount: number;
      paymentPlan: string;
      status: string;
      fulfillmentStatus: string;
    }> = [];

    const brandPerformanceMap = new Map<string, { brand: string; units: number; revenue: number }>();

    // Add Direct Sales
    for (const sale of rawDirectSales) {
      const snapshot: any = sale.variationSnapshot || {};
      const unitPrice = parseFloat(sale.unitPrice) || 0;
      const totalPrice = parseFloat(sale.totalPrice) || 0;
      const isPaid = sale.orderStatus === 'PAID' || sale.orderStatus === 'FULFILLED' || sale.orderStatus === 'PARTIALLY_FULFILLED';
      const paidAmount = isPaid ? totalPrice : 0;
      const remainingAmount = isPaid ? 0 : totalPrice;
      const brand = snapshot.brandName || 'Outro';

      const saleDate = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : '-';
      const rawDate: string = sale.createdAt ? new Date(sale.createdAt).toISOString() : todayStr;

      consolidatedSales.push({
        id: sale.id,
        type: 'PRONTA_ENTREGA',
        referenceNumber: sale.orderNumber,
        date: saleDate,
        rawDate,
        buyerName: sale.buyerName || 'Cliente',
        buyerEmail: sale.buyerEmail || '-',
        buyerWhatsapp: sale.buyerWhatsapp || null,
        miniatureName: snapshot.name || 'Miniatura',
        brandName: brand,
        quantity: sale.quantity || 1,
        unitPrice,
        totalPrice,
        paidAmount,
        remainingAmount,
        paymentPlan: 'À Vista',
        status: isPaid ? 'Pago' : 'Aguardando Pagamento',
        fulfillmentStatus: sale.fulfillmentStatus === 'NA_GARAGEM' ? 'Na Garagem' : sale.fulfillmentStatus === 'ENTREGUE' ? 'Entregue' : 'Pendente',
      });

      // Update Brand Performance
      const existingBrand = brandPerformanceMap.get(brand) || { brand, units: 0, revenue: 0 };
      existingBrand.units += sale.quantity || 1;
      existingBrand.revenue += totalPrice;
      brandPerformanceMap.set(brand, existingBrand);
    }

    // Add Pre-Orders
    for (const po of rawPreOrders) {
      const totalAmount = parseFloat(po.totalAmount) || 0;
      const paidAmount = parseFloat(po.paidAmount) || 0;
      const remainingAmount = parseFloat(po.remainingAmount) || 0;
      const brand = po.brandName || 'Outro';
      const unitPrice = (po.quantity && po.quantity > 0) ? (totalAmount / po.quantity) : totalAmount;

      const poDate = po.createdAt ? new Date(po.createdAt).toLocaleDateString('pt-BR') : '-';
      const rawDate: string = po.createdAt ? new Date(po.createdAt).toISOString() : todayStr;

      const planLabels: Record<string, string> = {
        DEPOSIT_AND_BALANCE: 'Sinal + Saldo na Chegada',
        FULL_ON_ARRIVAL: 'Integral na Chegada',
        INSTALLMENTS: 'Parcelado',
      };

      const statusLabels: Record<string, string> = {
        PENDING_APPROVAL: 'Aguardando Aprovação',
        RESERVED: 'Reservado',
        AWAITING_ARRIVAL: 'Aguardando Chegada',
        ARRIVED: 'Chegou na Loja',
        READY_FOR_DISPATCH: 'Pronto para Envio',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
      };

      consolidatedSales.push({
        id: po.id,
        type: 'PRE_VENDA',
        referenceNumber: po.preOrderNumber,
        date: poDate,
        rawDate,
        buyerName: po.buyerName || 'Colecionador',
        buyerEmail: po.buyerEmail || '-',
        buyerWhatsapp: po.buyerWhatsapp || null,
        miniatureName: po.variationName || 'Miniatura',
        brandName: brand,
        quantity: po.quantity || 1,
        unitPrice,
        totalPrice: totalAmount,
        paidAmount,
        remainingAmount,
        paymentPlan: planLabels[po.paymentPlan] || po.paymentPlan,
        status: statusLabels[po.status] || po.status,
        fulfillmentStatus: po.fulfillmentStatus === 'NA_GARAGEM' ? 'Na Garagem' : 'Entregue',
      });

      // Update Brand Performance
      const existingBrand = brandPerformanceMap.get(brand) || { brand, units: 0, revenue: 0 };
      existingBrand.units += po.quantity || 1;
      existingBrand.revenue += totalAmount;
      brandPerformanceMap.set(brand, existingBrand);
    }

    // Sort consolidated sales by date desc
    consolidatedSales.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    // 4. Receivables List
    const receivables: Array<{
      id: string;
      source: 'PARCELA_PRE_VENDA' | 'SALDO_CHEGADA' | 'PEDIDO_DIRETO';
      referenceNumber: string;
      description: string;
      buyerName: string;
      buyerEmail: string;
      buyerWhatsapp: string | null;
      miniatureName: string;
      amount: number;
      dueDate: string | null;
      rawDueDate: string | null;
      status: 'PENDING' | 'OVERDUE' | 'PAID';
      isOverdue: boolean;
      daysOverdue: number;
      paidAt: string | null;
      paymentMethod: string | null;
    }> = [];

    let totalReceivables = 0;
    let overdueReceivablesAmount = 0;
    let overdueReceivablesCount = 0;
    let receivablesDueThisMonth = 0;
    let totalRealizedInflow = 0;

    // Process Pre-order Installments
    for (const po of rawPreOrders) {
      const instList = installmentsByPreOrder.get(po.id) || [];

      if (instList.length > 0) {
        for (const inst of instList) {
          const instAmount = parseFloat(inst.amount) || 0;
          let isOverdue = false;
          let daysOverdue = 0;

          if (inst.status === 'PAID') {
            totalRealizedInflow += parseFloat(inst.paidAmount || inst.amount) || 0;
          } else {
            totalReceivables += instAmount;

            if (inst.dueDate) {
              const due = new Date(inst.dueDate);
              const today = new Date(todayStr);
              if (inst.dueDate < todayStr) {
                isOverdue = true;
                daysOverdue = Math.max(1, Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24)));
                overdueReceivablesAmount += instAmount;
                overdueReceivablesCount += 1;
              }

              if (inst.dueDate.startsWith(currentYearMonth)) {
                receivablesDueThisMonth += instAmount;
              }
            } else {
              // No due date set yet
              if (inst.status === 'OVERDUE') {
                isOverdue = true;
                overdueReceivablesAmount += instAmount;
                overdueReceivablesCount += 1;
              }
            }

            receivables.push({
              id: inst.id,
              source: 'PARCELA_PRE_VENDA',
              referenceNumber: po.preOrderNumber,
              description: inst.description || `Parcela ${inst.installmentNumber}/${inst.totalInstallments}`,
              buyerName: po.buyerName,
              buyerEmail: po.buyerEmail,
              buyerWhatsapp: po.buyerWhatsapp,
              miniatureName: po.variationName,
              amount: instAmount,
              dueDate: inst.dueDate ? new Date(inst.dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : null,
              rawDueDate: inst.dueDate || null,
              status: isOverdue ? 'OVERDUE' : (inst.status as any),
              isOverdue,
              daysOverdue,
              paidAt: inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('pt-BR') : null,
              paymentMethod: inst.paymentMethod || null,
            });
          }
        }
      } else {
        // Pre-orders without installments table (e.g. FULL_ON_ARRIVAL or single remaining balance)
        const remaining = parseFloat(po.remainingAmount) || 0;
        const paid = parseFloat(po.paidAmount) || 0;
        totalRealizedInflow += paid;

        if (remaining > 0) {
          totalReceivables += remaining;
          const arrivalDate: string | null = po.estimatedArrival;
          let isOverdue = false;
          let daysOverdue = 0;

          if (arrivalDate && arrivalDate.length === 10 && arrivalDate < todayStr) {
            isOverdue = true;
            daysOverdue = Math.max(1, Math.floor((new Date(todayStr).getTime() - new Date(arrivalDate).getTime()) / (1000 * 3600 * 24)));
            overdueReceivablesAmount += remaining;
            overdueReceivablesCount += 1;
          }

          if (arrivalDate && arrivalDate.startsWith(currentYearMonth)) {
            receivablesDueThisMonth += remaining;
          }

          receivables.push({
            id: `rem-${po.id}`,
            source: 'SALDO_CHEGADA',
            referenceNumber: po.preOrderNumber,
            description: 'Saldo Restante na Chegada',
            buyerName: po.buyerName,
            buyerEmail: po.buyerEmail,
            buyerWhatsapp: po.buyerWhatsapp,
            miniatureName: po.variationName,
            amount: remaining,
            dueDate: arrivalDate || 'Previsão de Chegada',
            rawDueDate: arrivalDate || null,
            status: isOverdue ? 'OVERDUE' : 'PENDING',
            isOverdue,
            daysOverdue,
            paidAt: null,
            paymentMethod: null,
          });
        }
      }
    }

    // Add Direct Sales that are PENDING_PAYMENT
    for (const sale of rawDirectSales) {
      const isPaid = sale.orderStatus === 'PAID' || sale.orderStatus === 'FULFILLED' || sale.orderStatus === 'PARTIALLY_FULFILLED';
      const totalPrice = parseFloat(sale.totalPrice) || 0;

      if (isPaid) {
        totalRealizedInflow += totalPrice;
      } else {
        totalReceivables += totalPrice;
        const snapshot: any = sale.variationSnapshot || {};
        receivables.push({
          id: `order-${sale.id}`,
          source: 'PEDIDO_DIRETO',
          referenceNumber: sale.orderNumber,
          description: 'Venda Pronta Entrega - Aguardando Pagamento',
          buyerName: sale.buyerName || 'Cliente',
          buyerEmail: sale.buyerEmail || '-',
          buyerWhatsapp: sale.buyerWhatsapp || null,
          miniatureName: snapshot.name || 'Miniatura',
          amount: totalPrice,
          dueDate: sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : null,
          rawDueDate: sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0] || null : null,
          status: 'PENDING',
          isOverdue: false,
          daysOverdue: 0,
          paidAt: null,
          paymentMethod: null,
        });
      }
    }

    // Sort receivables: OVERDUE first, then by dueDate asc
    receivables.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (!a.rawDueDate) return 1;
      if (!b.rawDueDate) return -1;
      return a.rawDueDate.localeCompare(b.rawDueDate);
    });

    // 5. Payables & Inventory Costs
    const payables: Array<{
      id: string;
      type: string;
      date: string;
      rawDate: string;
      sourceName: string;
      miniatureName: string;
      brandName: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
      notes: string | null;
    }> = [];

    let totalCosts = 0;

    for (const acq of rawAcquisitions) {
      const unitCost = parseFloat(acq.unitCost) || 0;
      const totalCost = parseFloat(acq.totalCost) || 0;
      totalCosts += totalCost;

      const typeLabels: Record<string, string> = {
        PURCHASE: 'Compra / Fornecedor',
        GIFT: 'Cortesia / Brinde',
        TRADE: 'Troca',
        PRIZE: 'Premiação',
        OTHER: 'Outro',
      };

      payables.push({
        id: acq.itemId,
        type: typeLabels[acq.acquisitionType] || acq.acquisitionType,
        date: acq.acquisitionDate ? new Date(acq.acquisitionDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-',
        rawDate: acq.acquisitionDate || todayStr,
        sourceName: acq.sourceName || 'Fornecedor / Importador',
        miniatureName: acq.variationName || 'Miniatura',
        brandName: acq.brandName || '-',
        quantity: acq.quantity || 1,
        unitCost,
        totalCost,
        notes: acq.notes ?? null,
      });
    }

    // 6. Monthly Forecast & Cash Flow Projection
    const forecastMap = new Map<string, { month: string; expectedInflow: number; realizedInflow: number; expectedOutflow: number }>();

    // Seed next 6 months + past 2 months
    const now = new Date();
    for (let i = -2; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = d.toISOString().slice(0, 7);
      forecastMap.set(ym, {
        month: ym,
        expectedInflow: 0,
        realizedInflow: 0,
        expectedOutflow: 0,
      });
    }

    // Populate inflows from receivables
    for (const rec of receivables) {
      if (rec.rawDueDate) {
        const ym = rec.rawDueDate.slice(0, 7);
        if (forecastMap.has(ym)) {
          const entry = forecastMap.get(ym)!;
          entry.expectedInflow += rec.amount;
        }
      }
    }

    // Populate realized inflows from sales
    for (const s of consolidatedSales) {
      const ym = s.rawDate.slice(0, 7);
      if (forecastMap.has(ym)) {
        const entry = forecastMap.get(ym)!;
        entry.realizedInflow += s.paidAmount;
      }
    }

    // Populate outflows from acquisitions
    for (const p of payables) {
      const ym = p.rawDate.slice(0, 7);
      if (forecastMap.has(ym)) {
        const entry = forecastMap.get(ym)!;
        entry.expectedOutflow += p.totalCost;
      }
    }

    const forecast = Array.from(forecastMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate Global Metrics
    let grossSales = 0;
    for (const s of consolidatedSales) {
      grossSales += s.totalPrice;
    }

    const estimatedProfit = totalRealizedInflow - totalCosts;
    const profitMargin = totalRealizedInflow > 0 ? (estimatedProfit / totalRealizedInflow) * 100 : 0;
    const averageTicket = consolidatedSales.length > 0 ? (grossSales / consolidatedSales.length) : 0;

    // Convert Brand Performance to Array
    const byBrand = Array.from(brandPerformanceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((b) => ({
        ...b,
        percentage: grossSales > 0 ? (b.revenue / grossSales) * 100 : 0,
      }));

    return {
      metrics: {
        grossSales,
        totalRealizedInflow,
        totalReceivables,
        overdueReceivablesAmount,
        overdueReceivablesCount,
        receivablesDueThisMonth,
        totalCosts,
        estimatedProfit,
        profitMargin,
        totalSalesCount: consolidatedSales.length,
        averageTicket,
      },
      sales: consolidatedSales,
      receivables,
      payables,
      forecast,
      byBrand,
    };
  }
}
