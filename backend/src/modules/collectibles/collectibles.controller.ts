import { FastifyReply, FastifyRequest } from 'fastify';
import { collectiblesService } from './collectibles.service';
import {
  createCollectibleSchema,
  updateCollectibleSchema,
  collectibleFilterQuerySchema,
} from './collectibles.schemas';

export class CollectiblesController {
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const query = collectibleFilterQuerySchema.parse(request.query || {});
    const result = await collectiblesService.listUserCollectibles(user.sub, query);
    return reply.status(200).send(result);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const item = await collectiblesService.getCollectibleDetail(id, user.sub);
    return reply.status(200).send({ data: item });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const input = createCollectibleSchema.parse(request.body);
    const created = await collectiblesService.createCollectible(user.sub, input);
    return reply.status(201).send({ data: created });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = updateCollectibleSchema.parse(request.body);
    const updated = await collectiblesService.updateCollectible(id, user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const res = await collectiblesService.deleteCollectible(id, user.sub);
    return reply.status(200).send(res);
  };

  getSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const summary = await collectiblesService.getAcervoSummary(user.sub);
    return reply.status(200).send({ data: summary });
  };
}

export const collectiblesController = new CollectiblesController();
