import { FastifyRequest, FastifyReply } from 'fastify';
import { StatsService } from './stats.service';

export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  async getCommunityStats(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.statsService.getCommunityStats();
    return reply.status(200).send(data);
  }
}
