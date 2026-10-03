import { FastifyReply, FastifyRequest } from 'fastify';
import { GarageService } from './garage.service';
import {
  shippingQuoteSchema,
  dispatchGarageSchema,
  cancelGarageItemParamSchema,
  cancelGarageItemBodySchema,
} from './garage.schemas';

export class GarageController {
  constructor(private readonly service = new GarageService()) {}

  listMyGarage = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await this.service.listMyGarage(request.user.sub);
    return reply.status(200).send({ data });
  };

  cancelGarageItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { orderItemId } = cancelGarageItemParamSchema.parse(request.params);
    const body = cancelGarageItemBodySchema.parse(request.body || {});
    const result = await this.service.cancelGarageItem(orderItemId, request.user.sub, body.reason || undefined);
    return reply.status(200).send({ data: result });
  };

  calculateShippingQuote = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = shippingQuoteSchema.parse(request.body);
    const result = await this.service.calculateShippingQuote(request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  dispatchGarage = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = dispatchGarageSchema.parse(request.body);
    const result = await this.service.dispatchGarage(request.user.sub, input);
    return reply.status(200).send({ data: result });
  };
}
