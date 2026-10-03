import { PreOrdersRepository } from './pre-orders.repository';
import { SellersRepository } from '../sellers/sellers.repository';
import {
  CreatePreOrderReservationInput,
  PreOrdersQuery,
  SettleInstallmentInput,
  UpdateInstallmentInput,
  UpdatePreOrderStatusInput,
  CollectorsStatusQuery,
} from './pre-orders.schemas';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/api-error';

export class PreOrdersService {
  constructor(
    private readonly repository = new PreOrdersRepository(),
    private readonly sellersRepository = new SellersRepository()
  ) {}

  private async getApprovedSellerOrThrow(userId: string) {
    const seller = await this.sellersRepository.findByUserId(userId);
    if (!seller || seller.authorizationStatus !== 'APPROVED' || !seller.isActive) {
      throw new ForbiddenError('Acesso restrito a vendedores autorizados');
    }
    return seller;
  }

  async createReservation(buyerId: string, input: CreatePreOrderReservationInput) {
    const offer = await this.repository.findOfferForPreOrder(input.offerId);
    if (!offer) {
      throw new NotFoundError('Oferta não encontrada');
    }

    if (offer.status === 'SOLD_OUT' || (offer.inventory && offer.inventory.available <= 0)) {
      throw new BadRequestError('As vagas / unidades deste lote de pré-venda estão 100% esgotadas.');
    }

    if (offer.status !== 'ACTIVE') {
      throw new BadRequestError('Esta oferta não está ativa para reservas');
    }

    if (offer.seller.userId === buyerId) {
      throw new BadRequestError('Você não pode reservar um item da sua própria loja');
    }

    if (!offer.isPreOrder) {
      throw new BadRequestError('Esta oferta é para pronta entrega e não aceita pré-venda');
    }

    // Validate payment plan against seller offer configuration
    if (input.paymentPlan === 'DEPOSIT_AND_BALANCE' && !offer.allowDepositAndBalance) {
      throw new BadRequestError('Esta oferta não aceita a modalidade Sinal + Saldo na Chegada');
    }

    if (input.paymentPlan === 'FULL_ON_ARRIVAL' && !offer.allowFullOnArrival) {
      throw new BadRequestError('Esta oferta não aceita a modalidade Pagamento Integral na Chegada');
    }

    if (input.paymentPlan === 'INSTALLMENTS') {
      if (!offer.allowInstallments) {
        throw new BadRequestError('Esta oferta não aceita a modalidade de Parcelamento');
      }
      if (input.installmentsCount && input.installmentsCount > offer.maxInstallments) {
        throw new BadRequestError(`Número de parcelas excede o limite máximo permitido (${offer.maxInstallments}x)`);
      }
    }

    return this.repository.createReservation(buyerId, offer, input);
  }

  async listSellerPreOrders(userId: string, query?: PreOrdersQuery) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.listSellerPreOrders(seller.id, query);
  }

  async listBuyerPreOrders(buyerId: string) {
    return this.repository.listBuyerPreOrders(buyerId);
  }

  async settleInstallment(
    preOrderId: string,
    installmentId: string,
    userId: string,
    input: SettleInstallmentInput
  ) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.settleInstallment(preOrderId, installmentId, userId, input);
  }

  async updateInstallment(
    preOrderId: string,
    installmentId: string,
    userId: string,
    input: UpdateInstallmentInput
  ) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.updateInstallment(preOrderId, installmentId, userId, input);
  }


  async updatePreOrderStatus(preOrderId: string, userId: string, input: UpdatePreOrderStatusInput) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.updatePreOrderStatus(preOrderId, userId, input);
  }

  async getSellerPreOrdersReport(userId: string) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.getSellerPreOrdersReport(seller.id);
  }

  async getSellerPreOrdersDashboard(userId: string, filter: 'ALL' | 'OPEN' | 'CLOSED' | 'ARRIVED' = 'ALL') {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.getSellerPreOrdersDashboard(seller.id, filter);
  }

  async markCampaignArrival(userId: string, offerId: string, arrivedAt?: string | null) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.markCampaignArrival(offerId, userId, arrivedAt);
  }

  async updatePreOrderFulfillment(
    userId: string,
    preOrderId: string,
    input: { fulfillmentStatus: 'NA_GARAGEM' | 'ENTREGUE'; hasArrived?: boolean; arrivedAt?: string | null }
  ) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.updatePreOrderFulfillment(preOrderId, userId, input);
  }

  async approveReservation(preOrderId: string, userId: string, notes?: string) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.approveReservation(preOrderId, userId, notes);
  }

  async rejectReservation(preOrderId: string, userId: string, reason: string) {
    await this.getApprovedSellerOrThrow(userId);
    return this.repository.rejectReservation(preOrderId, userId, reason);
  }

  async listCollectorsHealth(userId: string, query: CollectorsStatusQuery) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.listCollectorsHealth(seller.id, query);
  }

  async getCollectorFinancialSummary(userId: string, collectorId: string) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.getCollectorFinancialSummary(seller.id, collectorId);
  }
}

