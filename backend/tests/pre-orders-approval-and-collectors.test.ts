import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Pre-Orders Conditional Approval & Collector Health Tests', () => {
  it('Should correctly condition reservations on overdue installments (>10 days) and provide seller collectors health grid', async () => {
    const app = await buildApp();

    // 1. Login as seller
    const sellerLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'colecionador@minihubcar.com.br', password: 'Password123!' },
    });
    expect(sellerLoginRes.statusCode).toBe(200);
    const sellerToken = JSON.parse(sellerLoginRes.body).data.accessToken;

    // 2. Register clean buyer (no history, no overdue)
    const cleanEmail = `clean_buyer_${Date.now()}@test.com`;
    const cleanBuyerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Clean Collector', email: cleanEmail, password: 'Password123!' },
    });
    expect(cleanBuyerRes.statusCode).toBe(201);
    const cleanBuyerToken = JSON.parse(cleanBuyerRes.body).data.accessToken;

    // 3. Register delayed buyer
    const delayedEmail = `delayed_buyer_${Date.now()}@test.com`;
    const delayedBuyerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Delayed Collector', email: delayedEmail, password: 'Password123!' },
    });
    expect(delayedBuyerRes.statusCode).toBe(201);
    const delayedBuyerToken = JSON.parse(delayedBuyerRes.body).data.accessToken;
    const delayedBuyerId = JSON.parse(delayedBuyerRes.body).data.user.id;

    // 4. Get a variation and create offer 1
    const catRes = await app.inject({ method: 'GET', url: '/api/v1/catalog/search?pageSize=1' });
    const variation = JSON.parse(catRes.body).data[0];

    const offerRes1 = await app.inject({
      method: 'POST',
      url: '/api/v1/sellers/me/offers',
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: {
        variationId: variation.id,
        title: `${variation.name} - Teste Atraso e Aprovação`,
        price: '200.00',
        initialStock: 10,
        isPreOrder: true,
        allowInstallments: true,
        maxInstallments: 5,
      },
    });
    expect(offerRes1.statusCode).toBe(201);
    const offer1 = JSON.parse(offerRes1.body).data;

    // 5. Clean buyer reserves -> should be approved immediately (RESERVED)
    const cleanReserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${cleanBuyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'INSTALLMENTS',
        installmentsCount: 2,
      },
    });
    expect(cleanReserveRes.statusCode).toBe(201);
    const cleanReservation = JSON.parse(cleanReserveRes.body).data;
    expect(cleanReservation.status).toBe('RESERVED');
    expect(cleanReservation.requiresApproval).toBe(false);

    // 6. Give delayed buyer an installment overdue by 15 days (> 10 days!)
    // First, delayed buyer creates a pre-order with custom installment in the past
    const overdueDueDate = new Date();
    overdueDueDate.setDate(overdueDueDate.getDate() - 15);
    const overdueDueDateStr = overdueDueDate.toISOString().split('T')[0];

    const delayedPreOrderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${delayedBuyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'INSTALLMENTS',
        customInstallments: [
          { installmentNumber: 1, description: 'Parcela Vencida há 15 dias', amount: '100.00', dueDate: overdueDueDateStr },
          { installmentNumber: 2, description: 'Parcela Futura', amount: '100.00', dueDate: '2027-01-01' },
        ],
      },
    });
    expect(delayedPreOrderRes.statusCode).toBe(201);

    // 7. Now, delayed buyer attempts to reserve another pre-order!
    // Since they have an unpaid installment with dueDate > 10 days in the past, it MUST be PENDING_APPROVAL!
    const secondReserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${delayedBuyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'INSTALLMENTS',
        installmentsCount: 2,
      },
    });
    expect(secondReserveRes.statusCode).toBe(201);
    const secondReservation = JSON.parse(secondReserveRes.body).data;
    expect(secondReservation.status).toBe('PENDING_APPROVAL');
    expect(secondReservation.requiresApproval).toBe(true);
    expect(secondReservation.approvalReason).toMatch(/\d+ dias de atraso/);
    expect(secondReservation.approvalReason).toContain('em pré-venda na loja');

    // 8. Seller checks collectors health grid
    const collectorsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sellers/me/pre-orders/collectors?scope=my',
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(collectorsRes.statusCode).toBe(200);
    const collectorsData = JSON.parse(collectorsRes.body).data;
    expect(collectorsData.collectors.length).toBeGreaterThanOrEqual(2);

    const delayedCollectorEntry = collectorsData.collectors.find((c: any) => c.collectorId === delayedBuyerId);
    expect(delayedCollectorEntry).toBeDefined();
    expect(delayedCollectorEntry.healthStatus).toBe('RED');
    expect(delayedCollectorEntry.maxDaysOverdue).toBeGreaterThanOrEqual(14);
    expect(delayedCollectorEntry.pendingApprovalsWithSeller).toBe(1);

    // 9. Seller queries financial summary of delayed buyer
    const summaryRes = await app.inject({
      method: 'GET',
      url: `/api/v1/sellers/me/pre-orders/collectors/${delayedBuyerId}/summary`,
      headers: { authorization: `Bearer ${sellerToken}` },
    });
    expect(summaryRes.statusCode).toBe(200);
    const summaryData = JSON.parse(summaryRes.body).data;
    expect(summaryData.collector.healthStatus).toBe('RED');
    expect(summaryData.collector.maxDaysOverdue).toBeGreaterThanOrEqual(14);
    expect(summaryData.preOrders.length).toBe(2);

    // 10. Seller approves the pending reservation
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/pre-orders/${secondReservation.id}/approve`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: { notes: 'Aprovado pelo vendedor após contato direto via WhatsApp' },
    });
    expect(approveRes.statusCode).toBe(200);
    const approvedData = JSON.parse(approveRes.body).data;
    expect(approvedData.status).toBe('RESERVED');

    // 11. Now delayed buyer makes a 3rd reservation (which will also be PENDING_APPROVAL) and seller REJECTS it
    const thirdReserveRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-orders/reserve',
      headers: { authorization: `Bearer ${delayedBuyerToken}` },
      payload: {
        offerId: offer1.id,
        paymentPlan: 'INSTALLMENTS',
        installmentsCount: 2,
      },
    });
    expect(thirdReserveRes.statusCode).toBe(201);
    const thirdReservation = JSON.parse(thirdReserveRes.body).data;
    expect(thirdReservation.status).toBe('PENDING_APPROVAL');

    const rejectRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sellers/me/pre-orders/${thirdReservation.id}/reject`,
      headers: { authorization: `Bearer ${sellerToken}` },
      payload: { reason: 'Limite de crédito esgotado para pré-vendas' },
    });
    expect(rejectRes.statusCode).toBe(200);
    const rejectedData = JSON.parse(rejectRes.body).data;
    expect(rejectedData.status).toBe('CANCELLED');
    expect(rejectedData.rejectionReason).toBe('Limite de crédito esgotado para pré-vendas');
  });
});
