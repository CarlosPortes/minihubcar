import { FastifyReply, FastifyRequest } from 'fastify';
import { CatalogRequestsService } from './catalog-requests.service';
import {
  catalogRequestParamSchema,
  createCatalogRequestSchema,
  reviewCatalogRequestSchema,
} from './catalog-requests.schemas';
import { ForbiddenError } from '../../shared/errors/api-error';

export class CatalogRequestsController {
  constructor(private readonly service = new CatalogRequestsService()) {}

  listMine = async (request: FastifyRequest, reply: FastifyReply) => {
    const requests = await this.service.listUserRequests(request.user.sub);
    return reply.status(200).send({ data: requests });
  };

  listPending = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user.roles.includes('CATALOG_ADMIN') && !request.user.roles.includes('SYSTEM_ADMIN')) {
      throw new ForbiddenError('Apenas administradores podem visualizar solicitações pendentes');
    }

    const pending = await this.service.listAllPending();
    return reply.status(200).send({ data: pending });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createCatalogRequestSchema.parse(request.body);
    const created = await this.service.createRequest(request.user.sub, input);
    return reply.status(201).send({ data: created });
  };

  review = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user.roles.includes('CATALOG_ADMIN') && !request.user.roles.includes('SYSTEM_ADMIN')) {
      throw new ForbiddenError('Apenas administradores podem aprovar ou rejeitar solicitações');
    }

    const { id } = catalogRequestParamSchema.parse(request.params);
    const input = reviewCatalogRequestSchema.parse(request.body);
    const reviewed = await this.service.reviewRequest(id, request.user.sub, input);
    return reply.status(200).send({ data: reviewed });
  };
}
