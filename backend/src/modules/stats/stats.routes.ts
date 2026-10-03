import { FastifyInstance } from 'fastify';
import { StatsRepository } from './stats.repository';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

export async function statsRoutes(app: FastifyInstance) {
  const repository = new StatsRepository();
  const service = new StatsService(repository);
  const controller = new StatsController(service);

  app.get('/stats/community', (req, reply) => controller.getCommunityStats(req, reply));
}
