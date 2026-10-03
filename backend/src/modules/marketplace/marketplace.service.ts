import { MarketplaceRepository } from './marketplace.repository';
import { MarketplaceSearchQuery } from './marketplace.schemas';
import { NotFoundError } from '../../shared/errors/api-error';

export class MarketplaceService {
  constructor(private readonly repository = new MarketplaceRepository()) {}

  async search(query: MarketplaceSearchQuery) {
    return this.repository.searchMarketplace(query);
  }

  async getVariationOffers(variationId: string) {
    const result = await this.repository.getVariationOffers(variationId);
    if (!result) {
      throw new NotFoundError('Miniatura não encontrada no catálogo');
    }
    return result;
  }
}
