import { OffersRepository } from './offers.repository';
import { SellersRepository } from '../sellers/sellers.repository';
import { CreateOfferInput, UpdateOfferInput, AdjustStockInput } from './offers.schemas';
import { ForbiddenError, NotFoundError } from '../../shared/errors/api-error';

export class OffersService {
  constructor(
    private readonly repository = new OffersRepository(),
    private readonly sellersRepository = new SellersRepository()
  ) {}

  private async ensureApprovedSeller(userId: string) {
    const seller = await this.sellersRepository.findByUserId(userId);
    if (!seller || seller.authorizationStatus !== 'APPROVED' || !seller.isActive) {
      throw new ForbiddenError('Apenas vendedores com autorização comercial ativa podem publicar ofertas.');
    }
    return seller;
  }

  async listMyOffers(userId: string) {
    const seller = await this.ensureApprovedSeller(userId);
    return this.repository.listSellerOffers(seller.id);
  }

  async getOfferById(offerId: string) {
    const offer = await this.repository.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Oferta não encontrada');
    }
    return offer;
  }

  async createOffer(userId: string, input: CreateOfferInput) {
    const seller = await this.ensureApprovedSeller(userId);
    return this.repository.createOffer(seller.id, input);
  }

  async updateOffer(userId: string, offerId: string, input: UpdateOfferInput) {
    const seller = await this.ensureApprovedSeller(userId);
    return this.repository.updateOffer(offerId, seller.id, userId, input);
  }

  async adjustStock(userId: string, offerId: string, input: AdjustStockInput) {
    const seller = await this.ensureApprovedSeller(userId);
    return this.repository.adjustStock(offerId, seller.id, input);
  }
}
