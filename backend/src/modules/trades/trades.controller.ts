import { FastifyRequest, FastifyReply } from 'fastify';
import { TradesService } from './trades.service';
import {
  createTradeProposalSchema,
  toggleTradeSchema,
  updateProposalStatusSchema,
} from './trades.schemas';

export class TradesController {
  private service: TradesService;

  constructor() {
    this.service = new TradesService();
  }

  getMatches = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const matches = await this.service.findMatches(userId);
    return reply.status(200).send({ success: true, data: matches });
  };

  getMyTradeExemplars = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const exemplars = await this.service.getMyTradeExemplars(userId);
    return reply.status(200).send({ success: true, data: exemplars });
  };

  toggleTrade = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = toggleTradeSchema.parse(request.body);
    const result = await this.service.toggleTrade(userId, body);
    return reply.status(200).send({ success: true, data: result });
  };

  createProposal = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const body = createTradeProposalSchema.parse(request.body);
    const result = await this.service.createProposal(userId, body);
    return reply.status(201).send({ success: true, data: result });
  };

  listProposals = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const result = await this.service.listProposals(userId);
    return reply.status(200).send({ success: true, data: result });
  };

  updateProposalStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    const body = updateProposalStatusSchema.parse(request.body);
    const result = await this.service.updateProposalStatus(userId, id, body);
    return reply.status(200).send({ success: true, data: result });
  };
}
