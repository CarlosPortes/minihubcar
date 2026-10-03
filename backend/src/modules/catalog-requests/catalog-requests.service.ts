import { CatalogRequestsRepository } from './catalog-requests.repository';
import { CreateCatalogRequestInput, ReviewCatalogRequestInput } from './catalog-requests.schemas';
import { NotFoundError } from '../../shared/errors/api-error';

export class CatalogRequestsService {
  constructor(private readonly repository = new CatalogRequestsRepository()) {}

  async listUserRequests(userId: string) {
    return this.repository.listByUser(userId);
  }

  async listAllPending() {
    return this.repository.listAllPending();
  }

  async createRequest(userId: string, input: CreateCatalogRequestInput) {
    return this.repository.create(userId, input);
  }

  async reviewRequest(id: string, reviewerId: string, input: ReviewCatalogRequestInput) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('Solicitação não encontrada');
    }

    return this.repository.review(id, reviewerId, input);
  }
}
