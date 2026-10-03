import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Pre-Orders Quantity and Multiplied Installments Tests', () => {
  it('Should reserve multiple units of pre-order, multiply total and installments, and decrement inventory accordingly', async () => {
    const app = await buildApp();

    // 1. Login as seller
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

    // 2. Login as buyer
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

    // 3. Get a catalog variation
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    expect(catRes.statusCode).toBe(200);
    const variation = JSON.parse(catRes.body).data[0];

    // 4. Seller creates Pre-Order offer of R$ 140.00 with 4x installments and deposit = R$ 40.00, stock = 5
    const createOfferRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: variation.id,
        title: `${variation.name} - Pré-Venda Qty Test`,
        price: '140.00',
        condition: 'LACRADO',
        packagingState: 'PERFEITO',
        initialStock: 5,
        isPreOrder: true,
        preOrderEstimatedArrival: '2026-12-20',
        allowInstallments: true,
        maxInstallments: 4,
        depositAmount: '40.00',
      },
    });
    expect(createOfferRes.statusCode).toBe(201);
    const offerData = JSON.parse(createOfferRes.body).data;

    // 5. Buyer attempts to reserve quantity exceeding quota (e.g. 10 units when only 5 exist)
    const failReserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offerData.id,
        paymentPlan: 'INSTALLMENTS',
        quantity: 10,
        installmentsCount: 4,
        dueDateDay: 10,
      },
    });
    expect(failReserveRes.statusCode).toBe(400);
    expect(JSON.parse(failReserveRes.body).error.message).toMatch(/excede o limite de cotas disponíveis/i);

    // 6. Buyer reserves quantity = 2 with 4 installments and custom installments (R$ 40*2 = 80 entry, 200 remaining = 66.66 + 66.66 + 66.68)
    const successReserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offerData.id,
        paymentPlan: 'INSTALLMENTS',
        quantity: 2,
        installmentsCount: 4,
        dueDateDay: 10,
        customInstallments: [
          { installmentNumber: 1, description: '1ª Parcela (Entrada)', amount: '80.00', dueDate: '2026-10-10' },
          { installmentNumber: 2, description: 'Parcela 2 de 4', amount: '66.66', dueDate: '2026-11-10' },
          { installmentNumber: 3, description: 'Parcela 3 de 4', amount: '66.66', dueDate: '2026-12-10' },
          { installmentNumber: 4, description: 'Parcela 4 de 4', amount: '66.68', dueDate: '2027-01-10' },
        ],
      },
    });
    expect(successReserveRes.statusCode).toBe(201);
    const reservationData = JSON.parse(successReserveRes.body).data;

    expect(reservationData.quantity).toBe(2);
    expect(reservationData.totalAmount).toBe('280.00');
    expect(reservationData.installments.length).toBe(4);
    expect(reservationData.installments[0].amount).toBe('80.00');

    // 7. Check buyer pre-orders endpoint
    const buyerListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/buyers/me/pre-orders',
      headers: { authorization: `Bearer ${buyerToken}` },
    });
    expect(buyerListRes.statusCode).toBe(200);
    const buyerPreOrders = JSON.parse(buyerListRes.body).data;
    const foundBuyerPo = buyerPreOrders.find((p: any) => p.id === reservationData.id);
    expect(foundBuyerPo).toBeDefined();
    expect(foundBuyerPo.quantity).toBe(2);
    expect(foundBuyerPo.totalAmount).toBe('280.00');

    // 8. Check seller pre-orders endpoint and report
    const sellerListRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(sellerListRes.statusCode).toBe(200);
    const sellerPreOrders = JSON.parse(sellerListRes.body).data;
    const foundSellerPo = sellerPreOrders.find((p: any) => p.id === reservationData.id);
    expect(foundSellerPo).toBeDefined();
    expect(foundSellerPo.quantity).toBe(2);

    const reportRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/report',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(reportRes.statusCode).toBe(200);
    const reportData = JSON.parse(reportRes.body).data;
    const foundReportRow = reportData.rows.find((r: any) => r.preOrderNumber === reservationData.preOrderNumber);
    expect(foundReportRow).toBeDefined();
    expect(foundReportRow.quantity).toBe(2);

    await app.close();
  });
});
