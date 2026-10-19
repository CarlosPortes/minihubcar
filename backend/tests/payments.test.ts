import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app/app';

describe('Automated PIX & Payments Tests', () => {
  it('POST /api/v1/payments/pix generates valid BACEN EMVCo Copia-e-Cola payload and QR code', async () => {
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/pix',
      payload: {
        referenceType: 'DONATION',
        amount: 25.5,
        description: 'Apoio MiniHub Car',
        metadata: {
          donorName: 'Colecionador Teste',
          message: 'Parabéns pelo projeto!',
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('chargeId');
    expect(body.data).toHaveProperty('txid');
    expect(body.data).toHaveProperty('pixCopiaECola');
    expect(body.data).toHaveProperty('qrCodeUrl');
    expect(body.data.amount).toBe(25.5);
    expect(body.data.status).toBe('PENDING');

    // Verifica conformidade com o padrão BACEN BR Code (inicia com 000201 e contém BRL 986)
    expect(body.data.pixCopiaECola.startsWith('000201')).toBe(true);
    expect(body.data.pixCopiaECola).toContain('br.gov.bcb.pix');
    expect(body.data.pixCopiaECola).toContain('986'); // BRL
    expect(body.data.pixCopiaECola).toContain('25.50');

    // GET /api/v1/payments/pix/:id
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/pix/${body.data.chargeId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.body);
    expect(getBody.data.id).toBe(body.data.chargeId);
    expect(getBody.data.status).toBe('PENDING');

    // POST /api/v1/payments/pix/:id/verify
    const verifyRes = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/pix/${body.data.chargeId}/verify`,
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.data.status).toBe('PAID');

    // Confere se após verificação o status mudou para PAID
    const getResAfter = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/pix/${body.data.chargeId}`,
    });
    const getBodyAfter = JSON.parse(getResAfter.body);
    expect(getBodyAfter.data.status).toBe('PAID');
    expect(getBodyAfter.data.paidAt).toBeDefined();

    await app.close();
  });

  it('POST /api/v1/payments/webhook handles webhook callback and confirms charge by TxID', async () => {
    const app = await buildApp();

    // 1. Cria cobrança
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/pix',
      payload: {
        referenceType: 'DONATION',
        amount: 10.0,
      },
    });

    const body = JSON.parse(res.body);
    const { chargeId, txid } = body.data;

    // 2. Simula webhook de gateway
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/webhook',
      payload: {
        txid,
        status: 'PAID',
      },
    });

    expect(webhookRes.statusCode).toBe(200);

    // 3. Verifica se a cobrança foi marcada como PAID
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/pix/${chargeId}`,
    });

    const getBody = JSON.parse(getRes.body);
    expect(getBody.data.status).toBe('PAID');

    await app.close();
  });
});
