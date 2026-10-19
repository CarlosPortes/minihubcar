import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AnalyticsService } from './analytics.service';

const recordVisitSchema = z.object({
  path: z.string().min(1).max(500),
  visitorId: z.string().min(1).max(100),
  referer: z.string().max(500).optional(),
  deviceType: z.enum(['DESKTOP', 'MOBILE', 'TABLET']).optional(),
});

export class AnalyticsController {
  constructor(private readonly service = new AnalyticsService()) {}

  recordVisit = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const input = recordVisitSchema.parse(request.body);

      // Tenta extrair usuário autenticado se houver token Bearer válido
      let userId: string | undefined;
      try {
        if (request.headers.authorization) {
          const payload = await request.jwtVerify<{ sub: string }>();
          userId = payload?.sub;
        }
      } catch {
        // Ignora erro de token expirado ou inválido para não quebrar rastreamento anônimo
      }

      const clientIp =
        ((request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) ||
        request.ip;
      const userAgent = request.headers['user-agent'] as string | undefined;

      await this.service.recordVisit(input, clientIp, userAgent, userId);
      return reply.status(200).send({ success: true });
    } catch {
      // Falha silenciosa para não impactar navegação do usuário
      return reply.status(200).send({ success: false });
    }
  };

  getAdminStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await this.service.getAdminStats();
    return reply.status(200).send({ data: stats });
  };
}
