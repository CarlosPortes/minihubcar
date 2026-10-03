import { AdminCatalogRepository } from './admin-catalog.repository';
import {
  CreateAutomakerInput,
  UpdateAutomakerInput,
  CreateVehicleModelInput,
  UpdateVehicleModelInput,
  CreateMiniatureBrandInput,
  UpdateMiniatureBrandInput,
  CreateSeriesInput,
  UpdateSeriesInput,
  CreateScaleInput,
  UpdateScaleInput,
  CreateCatalogVariationInput,
  UpdateCatalogVariationInput,
} from './admin-catalog.schemas';

import { BadRequestError } from '../../shared/errors/api-error';

export class AdminCatalogService {
  constructor(private readonly repository = new AdminCatalogRepository()) {}

  // Automakers
  async listAutomakers() {
    return this.repository.listAutomakers();
  }

  async createAutomaker(input: CreateAutomakerInput) {
    if (!input.name.trim()) {
      throw new BadRequestError('Nome da montadora é obrigatório');
    }
    return this.repository.createAutomaker(input);
  }

  // Vehicle Models
  async listVehicleModels(automakerId?: string) {
    return this.repository.listVehicleModels(automakerId);
  }

  async createVehicleModel(input: CreateVehicleModelInput) {
    if (!input.name.trim()) {
      throw new BadRequestError('Nome do modelo de carro é obrigatório');
    }
    return this.repository.createVehicleModel(input);
  }

  // Miniature Brands
  async listMiniatureBrands() {
    return this.repository.listMiniatureBrands();
  }

  async createMiniatureBrand(input: CreateMiniatureBrandInput) {
    if (!input.name.trim()) {
      throw new BadRequestError('Nome da marca é obrigatório');
    }
    return this.repository.createMiniatureBrand(input);
  }

  // Series
  async listSeries(brandId?: string) {
    return this.repository.listSeries(brandId);
  }

  async createSeries(input: CreateSeriesInput) {
    if (!input.name.trim()) {
      throw new BadRequestError('Nome da série é obrigatório');
    }
    return this.repository.createSeries(input);
  }

  // Scales
  async listScales() {
    return this.repository.listScales();
  }

  async createScale(input: CreateScaleInput) {
    if (input.denominator <= 0) {
      throw new BadRequestError('O denominador da escala deve ser maior que zero');
    }
    return this.repository.createScale(input);
  }

  // Catalog Variation
  async createCatalogVariation(input: CreateCatalogVariationInput) {
    if (!input.name.trim()) {
      throw new BadRequestError('Nome da miniatura é obrigatório');
    }
    if (!input.castingName.trim()) {
      throw new BadRequestError('Nome do molde (casting) é obrigatório');
    }

    return this.repository.createCatalogVariation(input);
  }

  async updateCatalogVariation(variationId: string, input: UpdateCatalogVariationInput) {
    if (!variationId) {
      throw new BadRequestError('ID da miniatura é obrigatório');
    }
    return this.repository.updateCatalogVariation(variationId, input);
  }

  async updateAutomaker(id: string, input: UpdateAutomakerInput) {
    return this.repository.updateAutomaker(id, input);
  }

  async updateVehicleModel(id: string, input: UpdateVehicleModelInput) {
    return this.repository.updateVehicleModel(id, input);
  }

  async updateMiniatureBrand(id: string, input: UpdateMiniatureBrandInput) {
    return this.repository.updateMiniatureBrand(id, input);
  }

  async updateSeries(id: string, input: UpdateSeriesInput) {
    return this.repository.updateSeries(id, input);
  }

  async updateScale(id: string, input: UpdateScaleInput) {
    return this.repository.updateScale(id, input);
  }
}

