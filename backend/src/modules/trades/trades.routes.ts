import { FastifyInstance } from 'fastify';
import { TradesController } from './trades.controller';
import { authenticate } from '../auth/auth.middleware';

export async function tradesRoutes(app: FastifyInstance) {
  const controller = new TradesController();

  // Matchmaking de trocas inteligentes (Double Match, Eles Querem, Eles Têm)
  app.get('/trades/matches', { preHandler: [authenticate] }, controller.getMatches);

  // Lista de exemplares do usuário com switch de troca
  app.get('/trades/my-exemplars', { preHandler: [authenticate] }, controller.getMyTradeExemplars);

  // Ativar ou desativar disponibilidade para troca de um exemplar
  app.post('/trades/toggle', { preHandler: [authenticate] }, controller.toggleTrade);

  // Criar proposta formal de troca
  app.post('/trades/proposals', { preHandler: [authenticate] }, controller.createProposal);

  // Listar propostas recebidas e enviadas
  app.get('/trades/proposals', { preHandler: [authenticate] }, controller.listProposals);

  // Responder proposta (Aceitar / Recusar / Cancelar)
  app.patch('/trades/proposals/:id/status', { preHandler: [authenticate] }, controller.updateProposalStatus);
}
