import { FastifyReply, FastifyRequest } from 'fastify';
import { ExternalPreOrdersService } from './external-pre-orders.service';
import {
  createExternalPreOrderSchema,
  updateExternalPreOrderSchema,
  addExternalPaymentSchema,
  convertToCollectionSchema,
} from './external-pre-orders.schemas';

export class ExternalPreOrdersController {
  private service = new ExternalPreOrdersService();

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const query = request.query as { status?: string };
    const items = await this.service.list(user.sub, query);
    return reply.status(200).send({ data: items });
  };

  getSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const summary = await this.service.getSummary(user.sub);
    return reply.status(200).send({ data: summary });
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const item = await this.service.getById(id, user.sub);
    return reply.status(200).send({ data: item });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const input = createExternalPreOrderSchema.parse(request.body);
    const created = await this.service.create(user.sub, input);
    return reply.status(201).send({ data: created });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = updateExternalPreOrderSchema.parse(request.body);
    const updated = await this.service.update(id, user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  addPayment = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = addExternalPaymentSchema.parse(request.body);
    const result = await this.service.addPayment(id, user.sub, input);
    return reply.status(201).send({ data: result });
  };

  convertToCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const input = convertToCollectionSchema.parse(request.body);
    const result = await this.service.convertToCollection(id, user.sub, input);
    return reply.status(200).send({
      message: 'Pré-venda convertida com sucesso para o seu acervo físico!',
      data: result,
    });
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const { id } = request.params as { id: string };
    const res = await this.service.delete(id, user.sub);
    return reply.status(200).send({ message: 'Pré-venda excluída com sucesso', data: res });
  };
}

export const externalPreOrdersController = new ExternalPreOrdersController();
