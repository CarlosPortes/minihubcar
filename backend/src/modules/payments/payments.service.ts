import { eq, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../database/client';
import { pixCharge, donation, preOrderInstallment } from '../../database/schema';
import { env } from '../../config/env';
import { NotFoundError, BadRequestError } from '../../shared/errors/api-error';
import { generatePixCopiaECola, generatePixQrCodeUrl } from '../../shared/utils/pix-brcode';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreatePixChargeInput } from './payments.schemas';

export class PaymentsService {
  private subscriptionsService: SubscriptionsService;

  constructor() {
    this.subscriptionsService = new SubscriptionsService();
  }

  /**
   * Gera uma cobrança PIX com QR Code dinâmico e código Copia-e-Cola oficial
   */
  async createPixCharge(userId: string | null, input: CreatePixChargeInput) {
    const pixKey = env.DONATION_PIX_KEY || '5accf9cd-a478-4e40-a223-a3fbff42b868';
    const txid = `MHC${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const merchantName = 'MINIHUB CAR';
    const merchantCity = 'SAO PAULO';
    const description = input.description || `MiniHub Car - ${input.referenceType}`;

    const copiaECola = generatePixCopiaECola({
      pixKey,
      merchantName,
      merchantCity,
      amount: input.amount,
      txid,
      description,
    });

    const qrCodeUrl = generatePixQrCodeUrl(copiaECola, 320);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos de validade

    const [created] = await db
      .insert(pixCharge)
      .values({
        userId: userId || null,
        referenceType: input.referenceType,
        referenceId: input.referenceId || null,
        txid,
        amount: input.amount.toFixed(2),
        pixCopiaECola: copiaECola,
        qrCodeDataUrl: qrCodeUrl,
        status: 'PENDING',
        description,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        expiresAt,
      })
      .returning();

    if (!created) {
      throw new BadRequestError('Falha ao registrar cobrança PIX.');
    }

    return {
      chargeId: created.id,
      txid: created.txid,
      amount: parseFloat(created.amount),
      status: created.status,
      pixCopiaECola: created.pixCopiaECola,
      qrCodeUrl: created.qrCodeDataUrl,
      expiresAt: created.expiresAt,
      description: created.description,
    };
  }

  /**
   * Consulta o status atual de uma cobrança PIX
   */
  async getCharge(chargeId: string) {
    const [charge] = await db
      .select()
      .from(pixCharge)
      .where(eq(pixCharge.id, chargeId))
      .limit(1);

    if (!charge) {
      throw new NotFoundError('Cobrança PIX não encontrada.');
    }

    // Se estiver expirada e ainda PENDING, atualiza status
    if (charge.status === 'PENDING' && new Date() > new Date(charge.expiresAt)) {
      await db
        .update(pixCharge)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(pixCharge.id, chargeId));
      charge.status = 'EXPIRED';
    }

    return {
      ...charge,
      amount: parseFloat(charge.amount),
      metadata: charge.metadata ? JSON.parse(charge.metadata) : null,
    };
  }

  /**
   * Efetiva a confirmação de um pagamento PIX e dispara as regras de negócio
   */
  async confirmPayment(chargeId: string, details?: { provider?: string; externalId?: string }) {
    const [charge] = await db
      .select()
      .from(pixCharge)
      .where(eq(pixCharge.id, chargeId))
      .limit(1);

    if (!charge) {
      throw new NotFoundError('Cobrança PIX não encontrada.');
    }

    if (charge.status === 'PAID') {
      return { success: true, alreadyPaid: true, charge };
    }

    const now = new Date();

    // 1. Atualiza cobrança para PAID
    const [updatedCharge] = await db
      .update(pixCharge)
      .set({
        status: 'PAID',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(pixCharge.id, chargeId))
      .returning();

    if (!updatedCharge) {
      throw new BadRequestError('Falha ao atualizar cobrança para paga.');
    }

    const metadata = charge.metadata ? JSON.parse(charge.metadata) : {};

    // 2. Dispara ações correspondentes à referência da cobrança
    if (charge.referenceType === 'SUBSCRIPTION' && charge.userId) {
      const planCode = metadata.planCode || 'PRO';
      const billingCycle = metadata.billingCycle || 'MONTHLY';

      await this.subscriptionsService.subscribe(charge.userId, {
        planCode,
        billingCycle,
        paymentMethod: 'PIX',
      });
      console.log(`[PIX] Assinatura do usuário ${charge.userId} ativada com sucesso via PIX (Plano ${planCode})`);
    } else if (charge.referenceType === 'PRE_ORDER_INSTALLMENT' && charge.referenceId) {
      // Baixa automática na parcela de pré-venda
      await db
        .update(preOrderInstallment)
        .set({
          status: 'PAID',
          paidAt: now,
          paidAmount: charge.amount,
          paymentMethod: 'PIX',
          notes: `Pago automaticamente via PIX (TxID: ${charge.txid})`,
        })
        .where(eq(preOrderInstallment.id, charge.referenceId));
      console.log(`[PIX] Parcela de pré-venda ${charge.referenceId} quitada com sucesso via PIX.`);
    } else if (charge.referenceType === 'DONATION') {
      // Registra a doação como efetivada no termômetro do servidor
      const donorName = metadata.donorName || 'Apoiador PIX MiniHub';
      const message = metadata.message || 'Contribuição PIX confirmada';
      const monthRef = metadata.monthRef || now.toISOString().slice(0, 7);

      await db.insert(donation).values({
        userId: charge.userId || null,
        donorName: donorName.substring(0, 150),
        amount: charge.amount,
        pixKey: env.DONATION_PIX_KEY,
        message: message.substring(0, 500),
        status: 'CONFIRMED',
        monthRef,
      });
      console.log(`[PIX] Doação de R$ ${charge.amount} creditada via PIX.`);
    }

    return {
      success: true,
      alreadyPaid: false,
      charge: {
        ...updatedCharge,
        amount: parseFloat(updatedCharge.amount),
      },
    };
  }

  /**
   * Verificação ou Simulação de confirmação instantânea
   */
  async verifyOrConfirm(chargeId: string, currentUserId?: string, isAdmin = false) {
    const charge = await this.getCharge(chargeId);

    // Se o pagamento já foi confirmado
    if (charge.status === 'PAID') {
      return { status: 'PAID', message: 'Pagamento já confirmado com sucesso.' };
    }

    // Se for admin, ou se for anônimo (ex: doação avulsa), ou se for o próprio pagador autenticado
    const isOwner = charge.userId ? charge.userId === currentUserId : true;
    if (isAdmin || isOwner) {
      await this.confirmPayment(chargeId, { provider: 'DIRECT_CONFIRMATION' });
      return { status: 'PAID', message: 'Pagamento confirmado e ativado com sucesso!' };
    }

    return { status: charge.status, message: 'Aguardando compensação do PIX.' };
  }

  /**
   * Webhook universal para Mercado Pago / Asaas / Gateway
   */
  async handleWebhook(payload: any, query: any) {
    console.log('[PAYMENT WEBHOOK] Recebido webhook de pagamento:', { payload, query });

    // 1. Formato Mercado Pago: id do pagamento via query ou data.id
    const mpPaymentId = query?.['data.id'] || payload?.data?.id || payload?.id;

    // 2. Formato Asaas: event === 'PAYMENT_RECEIVED'
    const asaasExternalRef = payload?.payment?.externalReference || payload?.payment?.id;

    // 3. Formato direto: txid ou chargeId
    const txid = payload?.txid || payload?.external_reference || asaasExternalRef;
    const chargeId = payload?.chargeId;

    if (chargeId) {
      return this.confirmPayment(chargeId, { provider: 'WEBHOOK_DIRECT' });
    }

    if (txid) {
      const [found] = await db
        .select()
        .from(pixCharge)
        .where(eq(pixCharge.txid, txid))
        .limit(1);

      if (found) {
        return this.confirmPayment(found.id, { provider: 'WEBHOOK_TXID', externalId: mpPaymentId });
      }
    }

    return { received: true };
  }

  /**
   * Listagem de cobranças para o painel administrativo
   */
  async listCharges(limit = 50) {
    const charges = await db
      .select()
      .from(pixCharge)
      .orderBy(desc(pixCharge.createdAt))
      .limit(limit);

    return charges.map((c) => ({
      ...c,
      amount: parseFloat(c.amount),
      metadata: c.metadata ? JSON.parse(c.metadata) : null,
    }));
  }
}
