import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Pre-Orders Custom Installments Schedule Tests', () => {
  it('Should correctly create pre-order with custom 1st installment (140 total, 4x, 1st=40, rem=33.33/33.34) and monthly due dates', async () => {
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

    // 2. Register fresh buyer (with zero past overdue installments)
    const freshEmail = `custom_buyer_${Date.now()}@test.com`;
    const buyerRegRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Custom Buyer',
        email: freshEmail,
        password: 'Password123!',
      },
    });
    expect(buyerRegRes.statusCode).toBe(201);
    const buyerToken = JSON.parse(buyerRegRes.body).data.accessToken;

    // 3. Get catalog variation
    const catRes = await app.inject({
      method: 'GET',
      url: '/api/v1/catalog/search?pageSize=1',
    });
    expect(catRes.statusCode).toBe(200);
    const variation = JSON.parse(catRes.body).data[0];

    // 4. Seller creates Pre-Order offer of R$ 140.00 with 4x installments and 1st = 40.00
    const createOfferRes = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: variation.id,
        title: `${variation.name} - Pré-Venda 140 Parcelado`,
        price: '140.00',
        condition: 'LACRADO',
        packagingState: 'PERFEITO',
        description: 'Cronograma de Parcelamento (4x):\n• Parcela 1: 10/09/2026 — R$ 40.00 (Entrada)\n• Parcela 2: 10/10/2026 — R$ 33.33\n• Parcela 3: 10/11/2026 — R$ 33.33\n• Parcela 4: 10/12/2026 — R$ 33.34',
        initialStock: 5,
        isPreOrder: true,
        preOrderEstimatedArrival: '2026-12-15',
        allowInstallments: true,
        maxInstallments: 4,
        depositAmount: '40.00',
      },
    });
    expect(createOfferRes.statusCode).toBe(201);
    const offer = JSON.parse(createOfferRes.body).data;
    expect(offer.price).toBe('140.00');
    expect(offer.maxInstallments).toBe(4);
    expect(offer.depositAmount).toBe('40.00');

    // 5. Buyer reserves with customInstallments (exact schedule from frontend modal)
    const reserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${buyerToken}` },
      payload: {
        offerId: offer.id,
        paymentPlan: 'INSTALLMENTS',
        installmentsCount: 4,
        dueDateDay: 10,
        customInstallments: [
          { installmentNumber: 1, description: '1ª Parcela (Entrada)', amount: '40.00', dueDate: '2026-09-10' },
          { installmentNumber: 2, description: 'Parcela 2 de 4', amount: '33.33', dueDate: '2026-10-10' },
          { installmentNumber: 3, description: 'Parcela 3 de 4', amount: '33.33', dueDate: '2026-11-10' },
          { installmentNumber: 4, description: 'Parcela 4 de 4', amount: '33.34', dueDate: '2026-12-10' },
        ],
      },
    });
    expect(reserveRes.statusCode).toBe(201);
    const reservation = JSON.parse(reserveRes.body).data;

    expect(reservation.status).toBe('RESERVED');
    expect(reservation.totalAmount).toBe('140.00');
    expect(reservation.installments).toHaveLength(4);

    const inst1 = reservation.installments.find((i: any) => i.installmentNumber === 1);
    const inst2 = reservation.installments.find((i: any) => i.installmentNumber === 2);
    const inst3 = reservation.installments.find((i: any) => i.installmentNumber === 3);
    const inst4 = reservation.installments.find((i: any) => i.installmentNumber === 4);

    expect(inst1.amount).toBe('40.00');
    expect(inst1.dueDate).toBe('2026-09-10');

    expect(inst2.amount).toBe('33.33');
    expect(inst2.dueDate).toBe('2026-10-10');

    expect(inst3.amount).toBe('33.33');
    expect(inst3.dueDate).toBe('2026-11-10');

    expect(inst4.amount).toBe('33.34');
    expect(inst4.dueDate).toBe('2026-12-10');

    // Total exact check
    const sum = reservation.installments.reduce((acc: number, i: any) => acc + parseFloat(i.amount), 0);
    expect(Math.round(sum * 100) / 100).toBe(140.00);
  });
});
