import { CartRepository } from './cart.repository';
import { AddCartItemInput, UpdateCartItemInput } from './cart.schemas';

export class CartService {
  constructor(private readonly repository = new CartRepository()) {}

  async getMyCart(userId: string) {
    return this.repository.getCartWithItems(userId);
  }

  async addItem(userId: string, input: AddCartItemInput) {
    return this.repository.addItem(userId, input.offerId, input.quantity);
  }

  async updateQuantity(userId: string, cartItemId: string, input: UpdateCartItemInput) {
    return this.repository.updateItemQuantity(userId, cartItemId, input.quantity);
  }

  async removeItem(userId: string, cartItemId: string) {
    return this.repository.removeItem(userId, cartItemId);
  }

  async clearCart(userId: string) {
    return this.repository.clearCart(userId);
  }
}
