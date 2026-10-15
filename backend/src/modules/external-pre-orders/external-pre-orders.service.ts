import { ExternalPreOrdersRepository } from './external-pre-orders.repository';
import { CatalogRepository } from '../catalog/catalog.repository';
import { LocationsRepository } from '../locations/locations.repository';
import {
  CreateExternalPreOrderInput,
  UpdateExternalPreOrderInput,
  AddExternalPaymentInput,
  ConvertToCollectionInput,
} from './external-pre-orders.schemas';
import { NotFoundError, BadRequestError } from '../../shared/errors/api-error';

export class ExternalPreOrdersService {
  constructor(
    private readonly repo = new ExternalPreOrdersRepository(),
    private readonly catalogRepo = new CatalogRepository(),
    private readonly locationsRepo = new LocationsRepository()
  ) {}

  async list(userId: string, filter?: { status?: string }) {
    return this.repo.listByUser(userId, filter);
  }

  async getById(id: string, userId: string) {
    const item = await this.repo.getByIdAndUser(id, userId);
    if (!item) {
      throw new NotFoundError('Pré-venda externa não encontrada');
    }
    return item;
  }

  async getSummary(userId: string) {
    return this.repo.getSummary(userId);
  }

  async create(userId: string, input: CreateExternalPreOrderInput) {
    if (input.variationId) {
      const variation = await this.catalogRepo.getVariationById(input.variationId);
      if (!variation) {
        throw new NotFoundError('Variação do catálogo não encontrada');
      }
    } else if (!input.customMiniatureName) {
      throw new BadRequestError('Informe o nome da miniatura ou selecione uma peça do catálogo');
    }

    if (input.paidAmount > input.totalAmount) {
      throw new BadRequestError('O valor pago não pode ser superior ao valor total');
    }

    return this.repo.create(userId, input);
  }

  async update(id: string, userId: string, input: UpdateExternalPreOrderInput) {
    const existing = await this.repo.getByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Pré-venda externa não encontrada');
    }

    if (input.totalAmount !== undefined && input.totalAmount < parseFloat(existing.paidAmount || '0')) {
      throw new BadRequestError('O novo valor total não pode ser menor que o valor já pago');
    }

    return this.repo.update(id, userId, input);
  }

  async addPayment(id: string, userId: string, input: AddExternalPaymentInput) {
    const existing = await this.repo.getByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Pré-venda externa não encontrada');
    }

    const currentRemaining = parseFloat(existing.remainingAmount || '0');
    if (currentRemaining <= 0) {
      throw new BadRequestError('Esta pré-venda já está totalmente quitada');
    }

    return this.repo.addPayment(id, userId, input);
  }

  async delete(id: string, userId: string) {
    const existing = await this.repo.getByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Pré-venda externa não encontrada');
    }

    return this.repo.delete(id, userId);
  }

  async convertToCollection(id: string, userId: string, input: ConvertToCollectionInput) {
    const existing = await this.repo.getByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Pré-venda externa não encontrada');
    }

    if (existing.status === 'RECEIVED' || existing.convertedExemplarId) {
      throw new BadRequestError('Esta pré-venda já foi adicionada à sua coleção');
    }

    // Resolve condition
    const condition = await this.repo.getConditionTypeByCode(input.conditionCode || 'MINT');
    if (!condition) {
      throw new BadRequestError(`Condição '${input.conditionCode}' inválida`);
    }

    // Validate location if passed
    if (input.locationId) {
      const loc = await this.locationsRepo.findByIdAndUser(input.locationId, userId);
      if (!loc) {
        throw new NotFoundError('Localização informada não encontrada');
      }
    }

    return this.repo.convertToCollection(id, userId, input, condition.id);
  }
}
