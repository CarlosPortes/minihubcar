import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Pre-Orders Module Tests', () => {
  it('Should handle pre-order creation, reservations across payment plans, manual settlement, and seller reporting', async () => {
    const app = await buildApp();

    // 1. Login as seller (colecionador)
    const sellerLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'colecionador@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(sellerLoginRes.statusCode).toBe(200);
    const sellerToken = JSON.parse(sellerLoginRes.body).data.accessToken;

    // 2. Login as buyer (admin)
    const buyerLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@minihubcar.com.br',
        password: 'Password123!',
      },
    });
    expect(buyerLoginRes.statusCode).toBe(200);
    const buyerToken = JSON.parse(buyerLoginRes.body).data.accessToken;

    // 3. Get catalog variation to create pre-order offer
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    expect(catRes.statusCode).toBe(200);
    const variation = JSON.parse(catRes.body).data[0];
    expect(variation).toBeDefined();

    // 4. Seller creates a Pre-Order offer
    const createOfferRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: variation.id,
        title: `${variation.name} - Pré-Venda Especial RLC 2026`,
        price: '200.00',
        condition: 'LACRADO',
        packagingState: 'PERFEITO',
        description: 'Lote exclusivo sob encomenda. Chegada estimada para Novembro de 2026.',
        initialStock: 10,
        isPreOrder: true,
        preOrderEstimatedArrival: '2026-11-30',
        allowDepositAndBalance: true,
        depositAmount: '60.00',
        allowFullOnArrival: true,
        allowInstallments: true,
        maxInstallments: 4,
      },
    });
    expect(createOfferRes.statusCode).toBe(201);
    const offerData = JSON.parse(createOfferRes.body).data;
    expect(offerData.isPreOrder).toBe(true);
    expect(offerData.allowDepositAndBalance).toBe(true);

    // 5. Buyer reserves with Plan 1: DEPOSIT_AND_BALANCE
    const reserveDepositRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offerData.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
        notes: 'Gostaria de pagar o sinal via PIX hoje.',
      },
    });
    expect(reserveDepositRes.statusCode).toBe(201);
    const preOrderDeposit = JSON.parse(reserveDepositRes.body).data;
    expect(preOrderDeposit.preOrderNumber).toMatch(/^PRE-/);
    expect(preOrderDeposit.paymentPlan).toBe('DEPOSIT_AND_BALANCE');
    expect(preOrderDeposit.totalAmount).toBe('200.00');
    expect(preOrderDeposit.paidAmount).toBe('0.00');
    expect(preOrderDeposit.remainingAmount).toBe('200.00');
    expect(preOrderDeposit.installments).toHaveLength(2);
    expect(preOrderDeposit.installments[0].amount).toBe('60.00');
    expect(preOrderDeposit.installments[0].status).toBe('PENDING');
    expect(preOrderDeposit.installments[1].amount).toBe('140.00');

    // 6. Buyer reserves with Plan 2: INSTALLMENTS (3 parcelas de R$ 200 / 3)
    const reserveInstRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offerData.id,
        paymentPlan: 'INSTALLMENTS',
        installmentsCount: 3,
        dueDateDay: 15,
      },
    });
    expect(reserveInstRes.statusCode).toBe(201);
    const preOrderInst = JSON.parse(reserveInstRes.body).data;
    expect(preOrderInst.installments).toHaveLength(3);
    const sumInstallments = preOrderInst.installments.reduce(
      (acc: number, cur: any) => acc + parseFloat(cur.amount),
      0
    );
    expect(Math.round(sumInstallments * 100) / 100).toBe(200.00);

    // 7. Buyer reserves with Plan 3: FULL_ON_ARRIVAL
    const reserveArrivalRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offerData.id,
        paymentPlan: 'FULL_ON_ARRIVAL',
      },
    });
    expect(reserveArrivalRes.statusCode).toBe(201);
    const preOrderArrival = JSON.parse(reserveArrivalRes.body).data;
    expect(preOrderArrival.installments).toHaveLength(1);
    expect(preOrderArrival.installments[0].amount).toBe('200.00');

    // 8. Seller lists pre-orders
    const sellerListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(sellerListRes.statusCode).toBe(200);
    const sellerPreOrders = JSON.parse(sellerListRes.body).data;
    expect(sellerPreOrders.length).toBeGreaterThanOrEqual(3);

    // 9. Seller gives manual settlement (baixa manual) on Installment 1 of Deposit Pre-Order
    const inst1 = preOrderDeposit.installments[0];
    const settleRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/pre-orders/${preOrderDeposit.id}/installments/${inst1.id}/settle`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        paymentMethod: 'PIX',
        paidAmount: '60.00',
        notes: 'Comprovante recebido no WhatsApp',
      },
    });
    expect(settleRes.statusCode).toBe(200);
    const settleData = JSON.parse(settleRes.body).data;
    expect(settleData.installment.status).toBe('PAID');
    expect(settleData.installment.paymentMethod).toBe('PIX');
    expect(settleData.preOrder.paidAmount).toBe('60.00');
    expect(settleData.preOrder.remainingAmount).toBe('140.00');

    // 10. Seller updates pre-order status to ARRIVED
    const statusUpdateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/sellers/me/pre-orders/${preOrderDeposit.id}/status`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        status: 'ARRIVED',
        notes: 'Caixa de importação entregue na loja.',
      },
    });
    expect(statusUpdateRes.statusCode).toBe(200);
    expect(JSON.parse(statusUpdateRes.body).data.status).toBe('ARRIVED');

    // 11. Seller settles installment 2 -> pre-order status automatically becomes READY_FOR_DISPATCH
    const inst2 = preOrderDeposit.installments[1];
    const settle2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/pre-orders/${preOrderDeposit.id}/installments/${inst2.id}/settle`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        paymentMethod: 'PIX',
        paidAmount: '140.00',
      },
    });
    expect(settle2Res.statusCode).toBe(200);
    const settle2Data = JSON.parse(settle2Res.body).data;
    expect(settle2Data.preOrder.paidAmount).toBe('200.00');
    expect(settle2Data.preOrder.remainingAmount).toBe('0.00');
    expect(settle2Data.preOrder.status).toBe('READY_FOR_DISPATCH');

    // 12. Seller extracts report and aggregates
    const reportRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/report',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(reportRes.statusCode).toBe(200);
    const reportData = JSON.parse(reportRes.body).data;
    expect(reportData.metrics).toBeDefined();
    expect(reportData.metrics.totalContracted).toBeGreaterThanOrEqual(600);
    expect(reportData.metrics.totalPaid).toBeGreaterThanOrEqual(200);
    expect(reportData.rows.length).toBeGreaterThanOrEqual(6);

    // 14. Seller updates an installment due date and amount
    const instToEdit = preOrderInst.installments[1];
    const updateInstRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/sellers/me/pre-orders/${preOrderInst.id}/installments/${instToEdit.id}`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        dueDate: '2026-12-20',
        amount: '80.00',
        description: 'Parcela 2 de 3 (Renegociada)',
      },
    });
    expect(updateInstRes.statusCode).toBe(200);
    const updatedInstData = JSON.parse(updateInstRes.body).data;
    expect(updatedInstData.dueDate).toBe('2026-12-20');
    expect(updatedInstData.amount).toBe('80.00');
    expect(updatedInstData.description).toBe('Parcela 2 de 3 (Renegociada)');

    // 15. Pre-order quota control (e.g. 1 unit quota)
    const limitedOfferRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: variation.id,
        title: `${variation.name} - Pré-Venda Ultralimitada 1 Unidade`,
        price: '350.00',
        initialStock: 1, // Only 1 unit in quota!
        isPreOrder: true,
        allowDepositAndBalance: true,
        depositAmount: '100.00',
      },
    });
    expect(limitedOfferRes.statusCode).toBe(201);
    const limitedOffer = JSON.parse(limitedOfferRes.body).data;

    // First reservation uses the 1 available unit
    const reserve1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: limitedOffer.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
      },
    });
    expect(reserve1Res.statusCode).toBe(201);
    const reservation1 = JSON.parse(reserve1Res.body).data;

    // Second reservation fails because quota is sold out
    const reserve2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: limitedOffer.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
      },
    });
    expect(reserve2Res.statusCode).toBe(400);
    expect(JSON.parse(reserve2Res.body).error.message).toMatch(/esgotadas/i);

    // Cancel reservation1 -> restores quota and re-opens offer
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/sellers/me/pre-orders/${reservation1.id}/status`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        status: 'CANCELLED',
      },
    });
    expect(cancelRes.statusCode).toBe(200);

    // Now reservation can succeed again
    const reserveAgainRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: limitedOffer.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
      },
    });
    expect(reserveAgainRes.statusCode).toBe(201);
  });

  it('Pre-Orders Dashboard: 3 Cards (Abertas, Esgotadas, Chegaram), Arrival Date, and Garage/Delivered fulfillment', async () => {
    const app = await buildApp();

    // 1. Logins
    const sellerLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'colecionador@minihubcar.com.br', password: 'Password123!' },
    });
    const sellerToken = JSON.parse(sellerLoginRes.body).data.accessToken;

    const freshBuyerEmail = `dash_buyer_${Date.now()}@test.com`;
    const buyerRegRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Dash Buyer', email: freshBuyerEmail, password: 'Password123!' },
    });
    expect(buyerRegRes.statusCode).toBe(201);
    const buyerToken = JSON.parse(buyerRegRes.body).data.accessToken;

    // 2. Variations
    const catRes = await app.inject({ method: 'GET', url: '/api/v1/catalog/search?pageSize=2' });
    const variations = JSON.parse(catRes.body).data;
    expect(variations.length).toBeGreaterThanOrEqual(1);
    const var1 = variations[0];

    // 3. Create pre-order offer 1: quota 2
    const createRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: var1.id,
        title: `${var1.name} - Teste Dashboard Pré-Venda`,
        price: '180.00',
        condition: 'LACRADO',
        packagingState: 'PERFEITO',
        initialStock: 2,
        isPreOrder: true,
        preOrderEstimatedArrival: '2026-12-15',
        allowDepositAndBalance: true,
        depositAmount: '50.00',
      },
    });
    expect(createRes1.statusCode).toBe(201);
    const offer1 = JSON.parse(createRes1.body).data;

    // 4. Buyer reserves 1 unit (offer 1 is now OPEN with 1 slot left)
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
        quantity: 1,
      },
    });
    expect(reserveRes.statusCode).toBe(201);
    const reservation = JSON.parse(reserveRes.body).data;
    expect(reservation.fulfillmentStatus).toBe('NA_GARAGEM');
    expect(reservation.hasArrived).toBe(false);

    // 5. Query Dashboard - Check Card 1 (Abertas e Disponíveis)
    const dashRes1 = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/dashboard',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(dashRes1.statusCode).toBe(200);
    const dashData1 = JSON.parse(dashRes1.body).data;
    expect(dashData1.metrics.openAndAvailableCount).toBeGreaterThanOrEqual(1);

    // Verify campaign has reservations with buyer details
    const campaign1 = dashData1.campaigns.find((c: any) => c.id === offer1.id);
    expect(campaign1).toBeDefined();
    expect(campaign1.availableStock).toBe(1);
    expect(campaign1.reservedCount).toBe(1);
    expect(campaign1.totalQuota).toBe(2);
    expect(campaign1.reservations).toHaveLength(1);
    expect(campaign1.reservations[0].buyer.email).toBe(freshBuyerEmail);
    expect(campaign1.reservations[0].fulfillmentStatus).toBe('NA_GARAGEM');

    // 6. Test Card 2 (Encerradas / Vagas Esgotadas): reserve remaining 1 unit
    const reserve2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'DEPOSIT_AND_BALANCE',
        quantity: 1,
      },
    });
    expect(reserve2Res.statusCode).toBe(201);

    const dashRes2 = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/dashboard?filter=CLOSED',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(dashRes2.statusCode).toBe(200);
    const dashData2 = JSON.parse(dashRes2.body).data;
    expect(dashData2.metrics.closedQuotaFilledCount).toBeGreaterThanOrEqual(1);
    const closedCampaign = dashData2.campaigns.find((c: any) => c.id === offer1.id);
    expect(closedCampaign).toBeDefined();
    expect(closedCampaign.availableStock).toBe(0);
    expect(closedCampaign.reservedCount).toBe(2);

    // 7. Test Card 3 (Pré-vendas que Já Chegaram): Seller marks campaign arrival
    const arrivalDate = '2026-10-01T10:00:00.000Z';
    const arrivalRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/pre-orders/campaigns/${offer1.id}/arrival`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: { arrivedAt: arrivalDate },
    });
    expect(arrivalRes.statusCode).toBe(200);
    const updatedOffer = JSON.parse(arrivalRes.body).data;
    expect(updatedOffer.hasArrived).toBe(true);

    const dashRes3 = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/dashboard?filter=ARRIVED',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(dashRes3.statusCode).toBe(200);
    const dashData3 = JSON.parse(dashRes3.body).data;
    expect(dashData3.metrics.arrivedCount).toBeGreaterThanOrEqual(1);
    const arrivedCamp = dashData3.campaigns.find((c: any) => c.id === offer1.id);
    expect(arrivedCamp.hasArrived).toBe(true);
    expect(arrivedCamp.reservations[0].hasArrived).toBe(true);
    expect(arrivedCamp.reservations[0].status).toBe('ARRIVED');

    // 8. Test Garagem vs Entregue toggle on reservation
    const fulfillRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/sellers/me/pre-orders/${reservation.id}/fulfillment`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: { fulfillmentStatus: 'ENTREGUE' },
    });
    expect(fulfillRes.statusCode).toBe(200);
    const updatedRes = JSON.parse(fulfillRes.body).data;
    expect(updatedRes.fulfillmentStatus).toBe('ENTREGUE');
    expect(updatedRes.status).toBe('COMPLETED');
  });
});

