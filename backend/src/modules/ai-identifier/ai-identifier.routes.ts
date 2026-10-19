import { FastifyInstance } from 'fastify';
import { AiIdentifierController } from './ai-identifier.controller';
import { authenticate } from '../auth/auth.middleware';

export async function aiIdentifierRoutes(app: FastifyInstance) {
  const controller = new AiIdentifierController();

  // Status do motor de inteligência artificial
  app.get('/ai/status', controller.getStatus);

  // Escanear e identificar miniatura por imagem (IA Multimodal / Gemini Vision)
  app.post('/ai/identify-miniature', { preHandler: [authenticate] }, controller.identifyMiniature);
}
