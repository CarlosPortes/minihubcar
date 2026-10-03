import { FastifyReply, FastifyRequest } from 'fastify';
import { OffersService } from './offers.service';
import { createOfferSchema, updateOfferSchema, adjustStockSchema, offerParamSchema } from './offers.schemas';

export class OffersController {
  constructor(private readonly service = new OffersService()) {}

  listMyOffers = async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listMyOffers(request.user.sub);
    return reply.status(200).send({ data: list });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = offerParamSchema.parse(request.params);
    const offer = await this.service.getOfferById(id);
    return reply.status(200).send({ data: offer });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createOfferSchema.parse(request.body);
    const offer = await this.service.createOffer(request.user.sub, input);
    return reply.status(201).send({ data: offer });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = offerParamSchema.parse(request.params);
    const input = updateOfferSchema.parse(request.body);
    const updated = await this.service.updateOffer(request.user.sub, id, input);
    return reply.status(200).send({ data: updated });
  };

  adjustStock = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = offerParamSchema.parse(request.params);
    const input = adjustStockSchema.parse(request.body);
    const updated = await this.service.adjustStock(request.user.sub, id, input);
    return reply.status(200).send({ data: updated });
  };
}
