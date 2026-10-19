import { FastifyInstance, FastifyRequest } from 'fastify';
import { PaymentsController } from './payments.controller';
import { authenticate, requireAdmin } from '../auth/auth.middleware';

async function optionalAuthenticate(request: FastifyRequest) {
  try {
    const payload = await request.jwtVerify<{ sub: string; email: string; roles: string[] }>();
    request.user = payload;
  } catch {
    // Token opcional: permite checkout anônimo para doações e autenticado para assinaturas
  }
}

export async function paymentsRoutes(app: FastifyInstance) {
  const controller = new PaymentsController();

  // Criação de cobrança PIX com QR Code dinâmico e código Copia-e-Cola
  app.post('/payments/pix', { preHandler: [optionalAuthenticate] }, controller.createCharge);

  // Consulta do status da cobrança para polling do frontend
  app.get('/payments/pix/:id', controller.getCharge);

  // Verificação e confirmação instantânea
  app.post('/payments/pix/:id/verify', { preHandler: [optionalAuthenticate] }, controller.verifyCharge);

  // Webhook para Mercado Pago / Asaas / Gateway de pagamentos
  app.post('/payments/webhook', controller.handleWebhook);

  // Visão administrativa das transações PIX
  app.get('/admin/payments/charges', { preHandler: [authenticate, requireAdmin] }, controller.listAdminCharges);
}
