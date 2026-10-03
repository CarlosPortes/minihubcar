import { FastifyReply, FastifyRequest } from 'fastify';
import { MarketplaceService } from './marketplace.service';
import { marketplaceSearchQuerySchema, marketplaceVariationParamSchema } from './marketplace.schemas';

export class MarketplaceController {
  constructor(private readonly service = new MarketplaceService()) {}

  search = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = marketplaceSearchQuerySchema.parse(request.query);
    const results = await this.service.search(query);
    return reply.status(200).send(results);
  };

  getVariationOffers = async (request: FastifyRequest, reply: FastifyReply) => {
    const { variationId } = marketplaceVariationParamSchema.parse(request.params);
    const data = await this.service.getVariationOffers(variationId);
    return reply.status(200).send({ data });
  };
}
