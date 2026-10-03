import { FastifyReply, FastifyRequest } from 'fastify';
import { CatalogService } from './catalog.service';
import { catalogSearchQuerySchema, variationParamSchema } from './catalog.schemas';

export class CatalogController {
  constructor(private readonly catalogService = new CatalogService()) {}

  search = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = catalogSearchQuerySchema.parse(request.query);
    const result = await this.catalogService.searchCatalog(query);
    return reply.status(200).send(result);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = variationParamSchema.parse(request.params);
    const variation = await this.catalogService.getVariationDetail(id);
    return reply.status(200).send({ data: variation });
  };

  filters = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { brandId?: string };
    const filters = await this.catalogService.getFilterOptions(query.brandId);
    return reply.status(200).send({ data: filters });
  };

  series = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { brandId?: string };
    const seriesList = await this.catalogService.getSeries(query.brandId);
    return reply.status(200).send({ data: seriesList });
  };

  automakers = async (_request: FastifyRequest, reply: FastifyReply) => {
    const list = await this.catalogService.getAutomakers();
    return reply.status(200).send({ data: list });
  };

  vehicleModels = async (request: FastifyRequest, reply: FastifyReply) => {
    const { automakerId } = request.query as { automakerId?: string };
    const list = await this.catalogService.getVehicleModels(automakerId);
    return reply.status(200).send({ data: list });
  };
}
