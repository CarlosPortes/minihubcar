import { FastifyReply, FastifyRequest } from 'fastify';
import { WishlistService } from './wishlist.service';
import { addWishlistItemSchema, updateWishlistItemSchema, wishlistItemParamSchema } from './wishlist.schemas';

export class WishlistController {
  constructor(private readonly wishlistService = new WishlistService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const items = await this.wishlistService.getUserWishlist(request.user.sub);
    return reply.status(200).send({ data: items });
  };

  add = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = addWishlistItemSchema.parse(request.body);
    const item = await this.wishlistService.addToWishlist(request.user.sub, input);
    return reply.status(201).send({ data: item });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = wishlistItemParamSchema.parse(request.params);
    const input = updateWishlistItemSchema.parse(request.body);
    const updated = await this.wishlistService.updateWishlistItem(id, request.user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = wishlistItemParamSchema.parse(request.params);
    const removed = await this.wishlistService.removeFromWishlist(id, request.user.sub);
    return reply.status(200).send({ data: removed });
  };
}
