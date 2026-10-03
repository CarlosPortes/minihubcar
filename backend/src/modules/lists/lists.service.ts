import { ListsRepository } from './lists.repository';
import { AddListItemInput, CreateListInput } from './lists.schemas';
import { NotFoundError } from '../../shared/errors/api-error';

export class ListsService {
  constructor(private readonly repository = new ListsRepository()) {}

  async listUserLists(userId: string) {
    return this.repository.listByUser(userId);
  }

  async getListDetail(id: string, userId: string) {
    const list = await this.repository.findByIdAndUser(id, userId);
    if (!list) {
      throw new NotFoundError('Lista não encontrada');
    }
    return list;
  }

  async createList(userId: string, input: CreateListInput) {
    return this.repository.create(userId, input);
  }

  async addItemToList(listId: string, userId: string, input: AddListItemInput) {
    const list = await this.repository.findByIdAndUser(listId, userId);
    if (!list) {
      throw new NotFoundError('Lista não encontrada');
    }

    return this.repository.addItem(listId, input);
  }

  async removeItemFromList(listId: string, itemId: string, userId: string) {
    const list = await this.repository.findByIdAndUser(listId, userId);
    if (!list) {
      throw new NotFoundError('Lista não encontrada');
    }

    return this.repository.removeItem(listId, itemId);
  }

  async deleteList(id: string, userId: string) {
    const list = await this.repository.findByIdAndUser(id, userId);
    if (!list) {
      throw new NotFoundError('Lista não encontrada');
    }

    return this.repository.delete(id, userId);
  }
}
