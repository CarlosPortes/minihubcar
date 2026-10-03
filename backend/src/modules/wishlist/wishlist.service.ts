import { WishlistRepository } from './wishlist.repository';
import { AddWishlistItemInput, UpdateWishlistItemInput } from './wishlist.schemas';
import { CatalogRepository } from '../catalog/catalog.repository';
import { ConflictError, NotFoundError } from '../../shared/errors/api-error';

export class WishlistService {
  constructor(
    private readonly wishlistRepository = new WishlistRepository(),
    private readonly catalogRepository = new CatalogRepository()
  ) {}

  async getUserWishlist(userId: string) {
    return this.wishlistRepository.listByUser(userId);
  }

  async addToWishlist(userId: string, input: AddWishlistItemInput) {
    const variation = await this.catalogRepository.getVariationById(input.variationId);
    if (!variation) {
      throw new NotFoundError('Variação não encontrada no catálogo');
    }

    const existing = await this.wishlistRepository.findByUserAndVariation(userId, input.variationId);
    if (existing) {
      throw new ConflictError('Esta variação já está na sua Wishlist');
    }

    return this.wishlistRepository.add(userId, input);
  }

  async updateWishlistItem(id: string, userId: string, input: UpdateWishlistItemInput) {
    const existing = await this.wishlistRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Item não encontrado na Wishlist');
    }

    return this.wishlistRepository.update(id, userId, input);
  }

  async removeFromWishlist(id: string, userId: string) {
    const existing = await this.wishlistRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw new NotFoundError('Item não encontrado na Wishlist');
    }

    return this.wishlistRepository.remove(id, userId);
  }
}
