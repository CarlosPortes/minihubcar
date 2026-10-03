import { FastifyReply, FastifyRequest } from 'fastify';
import { CollectionService } from './collection.service';
import {
  addExemplarSchema,
  collectionFilterQuerySchema,
  exemplarParamSchema,
  moveExemplarSchema,
  updateExemplarSchema,
  importCollectionSchema,
} from './collection.schemas';

export class CollectionController {
  constructor(private readonly collectionService = new CollectionService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = collectionFilterQuerySchema.parse(request.query);
    const result = await this.collectionService.listCollection(request.user.sub, query);
    return reply.status(200).send(result);
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = exemplarParamSchema.parse(request.params);
    const exemplar = await this.collectionService.getExemplarDetail(id, request.user.sub);
    return reply.status(200).send({ data: exemplar });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = addExemplarSchema.parse(request.body);
    const newExemplar = await this.collectionService.addExemplar(request.user.sub, input);
    return reply.status(201).send({ data: newExemplar });
  };

  move = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = exemplarParamSchema.parse(request.params);
    const input = moveExemplarSchema.parse(request.body);
    const result = await this.collectionService.moveExemplar(id, request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = exemplarParamSchema.parse(request.params);
    const input = updateExemplarSchema.parse(request.body);
    const updated = await this.collectionService.updateExemplar(id, request.user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = exemplarParamSchema.parse(request.params);
    await this.collectionService.deleteExemplar(id, request.user.sub);
    return reply.status(200).send({ data: { message: 'Exemplar removido da coleção com sucesso' } });
  };

  importCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = importCollectionSchema.parse(request.body);
    const result = await this.collectionService.importCollection(request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  getPublicCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = (request.params as { userId: string });
    const query = collectionFilterQuerySchema.parse(request.query || {});
    const requestingUserId = (request as any).user?.sub;
    const result = await this.collectionService.getPublicCollection(userId, requestingUserId, query);
    return reply.status(200).send(result);
  };
}
