import { FastifyReply, FastifyRequest } from 'fastify';
import { ListsService } from './lists.service';
import {
  addListItemSchema,
  createListSchema,
  listItemParamSchema,
  listParamSchema,
} from './lists.schemas';

export class ListsController {
  constructor(private readonly service = new ListsService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const lists = await this.service.listUserLists(request.user.sub);
    return reply.status(200).send({ data: lists });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = listParamSchema.parse(request.params);
    const list = await this.service.getListDetail(id, request.user.sub);
    return reply.status(200).send({ data: list });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createListSchema.parse(request.body);
    const created = await this.service.createList(request.user.sub, input);
    return reply.status(201).send({ data: created });
  };

  addItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = listParamSchema.parse(request.params);
    const input = addListItemSchema.parse(request.body);
    const item = await this.service.addItemToList(id, request.user.sub, input);
    return reply.status(201).send({ data: item });
  };

  removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
    const { listId, itemId } = listItemParamSchema.parse(request.params);
    const removed = await this.service.removeItemFromList(listId, itemId, request.user.sub);
    return reply.status(200).send({ data: removed });
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = listParamSchema.parse(request.params);
    const deleted = await this.service.deleteList(id, request.user.sub);
    return reply.status(200).send({ data: deleted });
  };
}
