import { FastifyInstance } from 'fastify';
import { DonationsRepository } from './donations.repository';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';

export async function donationsRoutes(app: FastifyInstance) {
  const repository = new DonationsRepository();
  const service = new DonationsService(repository);
  const controller = new DonationsController(service);

  app.get('/donations/campaign', (req, reply) => controller.getCampaignStatus(req, reply));

  app.post('/donations/notify', async (req, reply) => {
    // Optional JWT check if user is logged in
    try {
      await req.jwtVerify();
    } catch {
      // Allow unauthenticated notifications as well
    }
    return controller.notifyDonation(req, reply);
  });
}
