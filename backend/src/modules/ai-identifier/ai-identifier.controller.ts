import { FastifyRequest, FastifyReply } from 'fastify';
import { AiIdentifierService } from './ai-identifier.service';
import { identifyMiniatureSchema } from './ai-identifier.schemas';

export class AiIdentifierController {
  private service: AiIdentifierService;

  constructor() {
    this.service = new AiIdentifierService();
  }

  identifyMiniature = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = identifyMiniatureSchema.parse(request.body);
    const result = await this.service.identifyMiniature(body);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  };

  getStatus = async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = this.service.getAiStatus();
    return reply.status(200).send({
      success: true,
      data: status,
    });
  };
}
