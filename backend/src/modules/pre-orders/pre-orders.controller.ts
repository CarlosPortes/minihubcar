import { FastifyReply, FastifyRequest } from 'fastify';
import { PreOrdersService } from './pre-orders.service';
import {
  createPreOrderReservationSchema,
  settleInstallmentSchema,
  updateInstallmentSchema,
  updatePreOrderStatusSchema,
  preOrderParamSchema,
  installmentParamSchema,
  preOrdersQuerySchema,
  offerParamSchema,
  markCampaignArrivalSchema,
  updatePreOrderFulfillmentSchema,
  dashboardQuerySchema,
  collectorsStatusQuerySchema,
  collectorParamSchema,
  approvePreOrderReservationSchema,
  rejectPreOrderReservationSchema,
} from './pre-orders.schemas';

export class PreOrdersController {
  constructor(private readonly service = new PreOrdersService()) {}

  reserve = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createPreOrderReservationSchema.parse(request.body);
    const result = await this.service.createReservation(request.user.sub, input);
    return reply.status(201).send({ data: result });
  };

  listSellerPreOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = preOrdersQuerySchema.parse(request.query);
    const result = await this.service.listSellerPreOrders(request.user.sub, query);
    return reply.status(200).send({ data: result });
  };

  getSellerPreOrdersReport = async (request: FastifyRequest, reply: FastifyReply) => {
    const report = await this.service.getSellerPreOrdersReport(request.user.sub);
    return reply.status(200).send({ data: report });
  };

  getSellerPreOrdersDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = dashboardQuerySchema.parse(request.query);
    const dashboard = await this.service.getSellerPreOrdersDashboard(request.user.sub, query.filter);
    return reply.status(200).send({ data: dashboard });
  };

  markCampaignArrival = async (request: FastifyRequest, reply: FastifyReply) => {
    const { offerId } = offerParamSchema.parse(request.params);
    const input = markCampaignArrivalSchema.parse(request.body || {});
    const result = await this.service.markCampaignArrival(request.user.sub, offerId, input.arrivedAt);
    return reply.status(200).send({ data: result });
  };

  updatePreOrderFulfillment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId } = preOrderParamSchema.parse(request.params);
    const input = updatePreOrderFulfillmentSchema.parse(request.body);
    const result = await this.service.updatePreOrderFulfillment(request.user.sub, preOrderId, input);
    return reply.status(200).send({ data: result });
  };

  settleInstallment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId, installmentId } = installmentParamSchema.parse(request.params);
    const input = settleInstallmentSchema.parse(request.body);
    const result = await this.service.settleInstallment(preOrderId, installmentId, request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  updateInstallment = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId, installmentId } = installmentParamSchema.parse(request.params);
    const input = updateInstallmentSchema.parse(request.body);
    const result = await this.service.updateInstallment(preOrderId, installmentId, request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  updatePreOrderStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId } = preOrderParamSchema.parse(request.params);
    const input = updatePreOrderStatusSchema.parse(request.body);
    const result = await this.service.updatePreOrderStatus(preOrderId, request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  listBuyerPreOrders = async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listBuyerPreOrders(request.user.sub);
    return reply.status(200).send({ data: list });
  };

  approveReservation = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId } = preOrderParamSchema.parse(request.params);
    const input = approvePreOrderReservationSchema.parse(request.body || {});
    const result = await this.service.approveReservation(preOrderId, request.user.sub, input.notes);
    return reply.status(200).send({ data: result });
  };

  rejectReservation = async (request: FastifyRequest, reply: FastifyReply) => {
    const { preOrderId } = preOrderParamSchema.parse(request.params);
    const input = rejectPreOrderReservationSchema.parse(request.body);
    const result = await this.service.rejectReservation(preOrderId, request.user.sub, input.reason);
    return reply.status(200).send({ data: result });
  };

  listCollectorsHealth = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = collectorsStatusQuerySchema.parse(request.query);
    const result = await this.service.listCollectorsHealth(request.user.sub, query);
    return reply.status(200).send({ data: result });
  };

  getCollectorFinancialSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const { collectorId } = collectorParamSchema.parse(request.params);
    const result = await this.service.getCollectorFinancialSummary(request.user.sub, collectorId);
    return reply.status(200).send({ data: result });
  };
}

