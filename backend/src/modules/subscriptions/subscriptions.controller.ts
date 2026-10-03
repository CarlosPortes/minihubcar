import { FastifyReply, FastifyRequest } from 'fastify';
import { subscriptionsService } from './subscriptions.service';
import {
  subscribeInputSchema,
  adminListSubscriptionsQuerySchema,
  adminUpdateSubscriptionSchema,
} from './subscriptions.schemas';

export class SubscriptionsController {
  listPlans = async (_request: FastifyRequest, reply: FastifyReply) => {
    const plans = await subscriptionsService.listPlans();
    return reply.status(200).send({ data: plans });
  };

  getMySubscription = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const sub = await subscriptionsService.getUserSubscription(user.sub);
    return reply.status(200).send({ data: sub });
  };

  getMyLimits = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const limits = await subscriptionsService.checkUserLimits(user.sub);
    return reply.status(200).send({ data: limits });
  };

  subscribe = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const input = subscribeInputSchema.parse(request.body);
    const result = await subscriptionsService.subscribe(user.sub, input);
    return reply.status(200).send({ data: result });
  };

  // ADMIN ENDPOINTS
  adminGetStats = async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = await subscriptionsService.adminGetStats();
    return reply.status(200).send({ data: stats });
  };

  adminList = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = adminListSubscriptionsQuerySchema.parse(request.query);
    const result = await subscriptionsService.adminListSubscriptions(query);
    return reply.status(200).send(result);
  };

  adminUpdate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };
    const input = adminUpdateSubscriptionSchema.parse(request.body);
    const result = await subscriptionsService.adminUpdateSubscription(userId, input);
    return reply.status(200).send({ data: result });
  };
}

export const subscriptionsController = new SubscriptionsController();
