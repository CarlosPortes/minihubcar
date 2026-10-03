import { CatalogRepository } from './catalog.repository';
import { CatalogSearchQuery } from './catalog.schemas';
import { NotFoundError } from '../../shared/errors/api-error';

export class CatalogService {
  constructor(private readonly catalogRepository = new CatalogRepository()) {}

  async searchCatalog(query: CatalogSearchQuery) {
    return this.catalogRepository.search(query);
  }

  async getVariationDetail(id: string) {
    const variation = await this.catalogRepository.getVariationById(id);
    if (!variation) {
      throw new NotFoundError('Variação não encontrada no catálogo');
    }
    return variation;
  }

  async getFilterOptions(brandId?: string) {
    const [brands, automakers, scales, years, rarities, seriesList] = await Promise.all([
      this.catalogRepository.getBrands(),
      this.catalogRepository.getAutomakers(),
      this.catalogRepository.getScales(),
      this.catalogRepository.getYears(),
      this.catalogRepository.getRarities(),
      this.catalogRepository.getSeries(brandId),
    ]);

    return {
      brands,
      automakers,
      scales,
      years,
      rarities,
      series: seriesList,
    };
  }

  async getSeries(brandId?: string) {
    return this.catalogRepository.getSeries(brandId);
  }

  async getAutomakers() {
    return this.catalogRepository.getAutomakers();
  }

  async getVehicleModels(automakerId?: string) {
    return this.catalogRepository.getVehicleModels(automakerId);
  }
}
