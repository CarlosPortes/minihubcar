import { FastifyRequest, FastifyReply } from 'fastify';
import { DonationsService } from './donations.service';

export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  async getCampaignStatus(_request: FastifyRequest, reply: FastifyReply) {
    const data = await this.donationsService.getCampaignStatus();
    return reply.status(200).send(data);
  }

  async notifyDonation(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body || {}) as {
      donorName?: string;
      amount?: number;
      message?: string;
    };

    const user = (request as any).user;
    const donation = await this.donationsService.registerDonation({
      userId: user?.id,
      donorName: body.donorName || user?.name,
      amount: Number(body.amount) || 10,
      message: body.message,
    });

    return reply.status(201).send({
      message: 'Contribuição registrada com sucesso! Muito obrigado por apoiar o MiniHub Car.',
      donation,
    });
  }
}
