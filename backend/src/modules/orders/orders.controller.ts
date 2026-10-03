import { FastifyReply, FastifyRequest } from 'fastify';
import { OrdersService } from './orders.service';
import {
  checkoutSchema,
  orderParamSchema,
  orderItemParamSchema,
  updateSaleFulfillmentSchema,
} from './orders.schemas';

export class OrdersController {
  constructor(private readonly service = new OrdersService()) {}

  checkout = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = checkoutSchema.parse(request.body);
    const order = await this.service.checkout(request.user.sub, input);
    return reply.status(201).send({ data: order });
  };

  listMine = async (request: FastifyRequest, reply: FastifyReply) => {
    const orders = await this.service.listMyOrders(request.user.sub);
    return reply.status(200).send({ data: orders });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = orderParamSchema.parse(request.params);
    const isAdmin = request.user.roles.includes('CATALOG_ADMIN') || request.user.roles.includes('SYSTEM_ADMIN');
    const order = await this.service.getOrderById(id, request.user.sub, isAdmin);
    return reply.status(200).send({ data: order });
  };

  listSales = async (request: FastifyRequest, reply: FastifyReply) => {
    const sales = await this.service.listMySales(request.user.sub);
    return reply.status(200).send({ data: sales });
  };

  updateSaleFulfillment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { orderItemId } = orderItemParamSchema.parse(request.params);
    const input = updateSaleFulfillmentSchema.parse(request.body);
    const result = await this.service.updateSaleFulfillment(
      request.user.sub,
      orderItemId,
      input.fulfillmentStatus
    );
    return reply.status(200).send({ data: result });
  };
}

