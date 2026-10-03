import { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../database/client.js';

export async function healthRoutes(app: FastifyInstance) {
  // Liveness probe (does not depend on database)
  app.get('/health', async (_req, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'minihub-car-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe (verifies database connectivity)
  app.get('/health/ready', async (_req, reply) => {
    const isDbHealthy = await checkDatabaseHealth();

    if (!isDbHealthy) {
      return reply.status(503).send({
        status: 'unavailable',
        service: 'minihub-car-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return reply.status(200).send({
      status: 'ready',
      service: 'minihub-car-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  });
}
