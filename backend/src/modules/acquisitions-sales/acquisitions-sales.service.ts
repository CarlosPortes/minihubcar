import { AcquisitionsSalesRepository } from './acquisitions-sales.repository';
import { RecordAcquisitionInput, RecordSaleInput, RecordWriteOffInput } from './acquisitions-sales.schemas';
import { CollectionRepository } from '../collection/collection.repository';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';

export class AcquisitionsSalesService {
  constructor(
    private readonly repository = new AcquisitionsSalesRepository(),
    private readonly collectionRepository = new CollectionRepository()
  ) {}

  async listSales(userId: string) {
    return this.repository.listSales(userId);
  }

  async listAcquisitions(userId: string) {
    return this.repository.listAcquisitions(userId);
  }

  async recordSale(userId: string, input: RecordSaleInput) {
    const exemplar = await this.collectionRepository.findByIdAndUser(input.exemplarId, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção');
    }

    if (exemplar.status === 'SOLD') {
      throw new BadRequestError('Este exemplar já consta como vendido');
    }

    return this.repository.recordSale(userId, input);
  }

  async recordAcquisition(userId: string, input: RecordAcquisitionInput) {
    const exemplar = await this.collectionRepository.findByIdAndUser(input.exemplarId, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção');
    }

    return this.repository.recordAcquisition(userId, input);
  }

  async listWriteOffs(userId: string) {
    return this.repository.listWriteOffs(userId);
  }

  async recordWriteOff(userId: string, input: RecordWriteOffInput) {
    const exemplar = await this.collectionRepository.findByIdAndUser(input.exemplarId, userId);
    if (!exemplar) {
      throw new NotFoundError('Exemplar não encontrado na sua coleção');
    }

    if (exemplar.status === 'SOLD') {
      throw new BadRequestError('Este exemplar já consta como vendido');
    }

    if (exemplar.status === 'DISCARDED') {
      throw new BadRequestError('Este exemplar já foi baixado');
    }

    return this.repository.recordWriteOff(userId, input);
  }
}
