import { OrdersRepository } from './orders.repository';
import { SellersRepository } from '../sellers/sellers.repository';
import { CheckoutInput } from './orders.schemas';
import { ForbiddenError, NotFoundError } from '../../shared/errors/api-error';

export class OrdersService {
  constructor(
    private readonly repository = new OrdersRepository(),
    private readonly sellersRepository = new SellersRepository()
  ) {}

  async checkout(userId: string, input: CheckoutInput) {
    return this.repository.checkout(userId, input);
  }

  async listMyOrders(userId: string) {
    return this.repository.listUserOrders(userId);
  }

  async getOrderById(orderId: string, userId: string, isAdmin: boolean) {
    const order = await this.repository.getOrderById(orderId, userId, isAdmin);
    if (!order) {
      throw new NotFoundError('Pedido não encontrado');
    }
    return order;
  }

  async listMySales(userId: string) {
    const seller = await this.sellersRepository.findByUserId(userId);
    if (!seller) {
      throw new ForbiddenError('Apenas vendedores possuem histórico de vendas');
    }
    return this.repository.listSellerSales(seller.id);
  }

  async updateSaleFulfillment(
    userId: string,
    orderItemId: string,
    fulfillmentStatus: 'NA_GARAGEM' | 'AGUARDANDO_ENVIO' | 'ENTREGUE'
  ) {
    const seller = await this.sellersRepository.findByUserId(userId);
    if (!seller || seller.authorizationStatus !== 'APPROVED' || !seller.isActive) {
      throw new ForbiddenError('Acesso restrito a vendedores autorizados');
    }
    return this.repository.updateSaleFulfillment(orderItemId, userId, fulfillmentStatus);
  }
}

