import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentsService } from './payments.service';
import { createPixChargeSchema } from './payments.schemas';

export class PaymentsController {
  private service: PaymentsService;

  constructor() {
    this.service = new PaymentsService();
  }

  createCharge = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.sub || null;
    const body = createPixChargeSchema.parse(request.body);

    const result = await this.service.createPixCharge(userId, body);
    return reply.status(201).send({ success: true, data: result });
  };

  getCharge = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const result = await this.service.getCharge(id);
    return reply.status(200).send({ success: true, data: result });
  };

  verifyCharge = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.sub;
    const roles = request.user?.roles || [];
    const isAdmin = roles.includes('CATALOG_ADMIN') || roles.includes('SYSTEM_ADMIN');

    const result = await this.service.verifyOrConfirm(id, userId, isAdmin);
    return reply.status(200).send({ success: true, data: result });
  };

  handleWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.handleWebhook(request.body, request.query);
    return reply.status(200).send(result);
  };

  listAdminCharges = async (request: FastifyRequest, reply: FastifyReply) => {
    const charges = await this.service.listCharges(50);
    return reply.status(200).send({ success: true, data: charges });
  };
}
