import { FastifyReply, FastifyRequest } from 'fastify';
import { CartService } from './cart.service';
import { addCartItemSchema, updateCartItemSchema, cartItemParamSchema } from './cart.schemas';

export class CartController {
  constructor(private readonly service = new CartService()) {}

  getCart = async (request: FastifyRequest, reply: FastifyReply) => {
    const userCart = await this.service.getMyCart(request.user.sub);
    return reply.status(200).send({ data: userCart });
  };

  addItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = addCartItemSchema.parse(request.body);
    const item = await this.service.addItem(request.user.sub, input);
    return reply.status(201).send({ data: item });
  };

  updateQuantity = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = cartItemParamSchema.parse(request.params);
    const input = updateCartItemSchema.parse(request.body);
    const updated = await this.service.updateQuantity(request.user.sub, id, input);
    return reply.status(200).send({ data: updated });
  };

  removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = cartItemParamSchema.parse(request.params);
    await this.service.removeItem(request.user.sub, id);
    return reply.status(200).send({ message: 'Item removido do carrinho' });
  };

  clear = async (request: FastifyRequest, reply: FastifyReply) => {
    await this.service.clearCart(request.user.sub);
    return reply.status(200).send({ message: 'Carrinho esvaziado com sucesso' });
  };
}
