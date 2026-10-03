import { FastifyReply, FastifyRequest } from 'fastify';
import { DashboardService } from './dashboard.service';

export class DashboardController {
  constructor(private readonly dashboardService = new DashboardService()) {}

  getSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const summary = await this.dashboardService.getDashboardSummary(request.user.sub);
    return reply.status(200).send({ data: summary });
  };
}
