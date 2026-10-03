import { PreOrdersRepository } from './pre-orders.repository';
import { SellersRepository } from '../sellers/sellers.repository';
import {
  CreatePreOrderReservationInput,
  PreOrdersQuery,
  SettleInstallmentInput,
  UpdateInstallmentInput,
  UpdatePreOrderStatusInput,
  CollectorsStatusQuery,
  CreateManualPreOrderInput,
  ImportPreOrdersBatchInput,
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

  async createManualPreOrder(userId: string, input: CreateManualPreOrderInput) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.createManualPreOrder(seller.id, seller.storeName, input);
  }

  async importPreOrdersBatch(userId: string, input: ImportPreOrdersBatchInput) {
    const seller = await this.getApprovedSellerOrThrow(userId);
    return this.repository.importPreOrdersBatch(seller.id, seller.storeName, input.items);
  }

  getImportTemplateCsv(): string {
    const headers = [
      'Nome Cliente',
      'Email Cliente',
      'WhatsApp Cliente',
      'Miniatura',
      'Fabricante',
      'Data Previsão Chegada',
      'Quantidade',
      'Total Miniatura (R$)',
      'Modalidade',
      'Parcela Nº',
      'Total Parcelas',
      'Valor Parcela (R$)',
      'Data Vencimento',
      'Status Parcela',
      'Data Baixa',
      'Valor Baixado (R$)',
      'Meio de Pagamento',
      'Observações',
    ];

    const examples = [
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '1',
        '3',
        '60,00',
        '2026-10-10',
        'PAGA',
        '2026-10-01',
        '60,00',
        'PIX',
        'Sinal pago via PIX',
      ],
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '2',
        '3',
        '60,00',
        '2026-11-10',
        'PENDENTE',
        '',
        '',
        '',
        '',
      ],
      [
        'João da Silva',
        'joao.silva@exemplo.com.br',
        '11987654321',
        'Nissan Skyline GT-R R34 Kaido House #12',
        'Kaido House',
        '2026-12-15',
        '1',
        '180,00',
        'Parcelado',
        '3',
        '3',
        '60,00',
        '2026-12-10',
        'PENDENTE',
        '',
        '',
        '',
        '',
      ],
      [
        'Mariana Oliveira',
        'mariana.oliveira@exemplo.com.br',
        '21998877665',
        'Porsche 911 GT3 R Test Edition Almost Real',
        'Almost Real',
        '2027-01-20',
        '1',
        '220,00',
        'Sinal + Saldo na Chegada',
        '1',
        '2',
        '50,00',
        '2026-10-05',
        'PAGA',
        '2026-10-02',
        '50,00',
        'PIX',
        'Entrada garantida',
      ],
      [
        'Mariana Oliveira',
        'mariana.oliveira@exemplo.com.br',
        '21998877665',
        'Porsche 911 GT3 R Test Edition Almost Real',
        'Almost Real',
        '2027-01-20',
        '1',
        '220,00',
        'Sinal + Saldo na Chegada',
        '2',
        '2',
        '170,00',
        '2027-01-20',
        'PENDENTE',
        '',
        '',
        '',
        'Saldo na chegada',
      ],
    ];

    const lines = [
      headers.join(';'),
      ...examples.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')),
    ];

    return '\uFEFF' + lines.join('\r\n');
  }
}

