import { FastifyReply, FastifyRequest } from 'fastify';
import { SellersService } from './sellers.service';
import { SellersFinanceService } from './sellers-finance.service';
import { sellerFinanceFilterSchema } from './sellers-finance.schemas';
import {
  applySellerSchema,
  updateSellerProfileSchema,
  reviewSellerSchema,
  sellerParamSchema,
  sellerSlugParamSchema,
  createSellerShippingAddressSchema,
  updateSellerShippingAddressSchema,
  shippingAddressParamSchema,
  saveShippingIntegrationSchema,
  providerParamSchema,
  quickCreateVariationSchema,
} from './sellers.schemas';

import { ForbiddenError } from '../../shared/errors/api-error';

export class SellersController {
  constructor(
    private readonly service = new SellersService(),
    private readonly financeService = new SellersFinanceService()
  ) {}

  apply = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = applySellerSchema.parse(request.body);
    const seller = await this.service.apply(request.user.sub, input);
    return reply.status(201).send({ data: seller });
  };

  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await this.service.getMe(request.user.sub);
    return reply.status(200).send({ data: profile });
  };

  updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = updateSellerProfileSchema.parse(request.body);
    const updated = await this.service.updateMe(request.user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  getBySlug = async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = sellerSlugParamSchema.parse(request.params);
    const profile = await this.service.getBySlug(slug);
    return reply.status(200).send({ data: profile });
  };

  listAddresses = async (request: FastifyRequest, reply: FastifyReply) => {
    const addresses = await this.service.listAddresses(request.user.sub);
    return reply.status(200).send({ data: addresses });
  };

  createAddress = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createSellerShippingAddressSchema.parse(request.body);
    const created = await this.service.createAddress(request.user.sub, input);
    return reply.status(201).send({ data: created });
  };

  updateAddress = async (request: FastifyRequest, reply: FastifyReply) => {
    const { addressId } = shippingAddressParamSchema.parse(request.params);
    const input = updateSellerShippingAddressSchema.parse(request.body);
    const updated = await this.service.updateAddress(request.user.sub, addressId, input);
    return reply.status(200).send({ data: updated });
  };

  deleteAddress = async (request: FastifyRequest, reply: FastifyReply) => {
    const { addressId } = shippingAddressParamSchema.parse(request.params);
    const deleted = await this.service.deleteAddress(request.user.sub, addressId);
    return reply.status(200).send({ data: deleted });
  };

  listAdminApplications = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user.roles.includes('CATALOG_ADMIN') && !request.user.roles.includes('SYSTEM_ADMIN')) {
      throw new ForbiddenError('Acesso restrito a administradores');
    }
    const query = request.query as { status?: string };
    const list = await this.service.listApplications(query.status);
    return reply.status(200).send({ data: list });
  };

  review = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user.roles.includes('CATALOG_ADMIN') && !request.user.roles.includes('SYSTEM_ADMIN')) {
      throw new ForbiddenError('Acesso restrito a administradores');
    }
    const { id } = sellerParamSchema.parse(request.params);
    const input = reviewSellerSchema.parse(request.body);
    const reviewed = await this.service.review(id, request.user.sub, input);
    return reply.status(200).send({ data: reviewed });
  };

  listShippingIntegrations = async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listShippingIntegrations(request.user.sub);
    return reply.status(200).send({ data: list });
  };

  saveShippingIntegration = async (request: FastifyRequest, reply: FastifyReply) => {
    const { provider } = providerParamSchema.parse(request.params);
    const input = saveShippingIntegrationSchema.parse(request.body);
    const saved = await this.service.saveShippingIntegration(request.user.sub, provider, input);
    return reply.status(200).send({ data: saved });
  };

  deleteShippingIntegration = async (request: FastifyRequest, reply: FastifyReply) => {
    const { provider } = providerParamSchema.parse(request.params);
    const success = await this.service.deleteShippingIntegration(request.user.sub, provider);
    return reply.status(200).send({ data: { success } });
  };

  getFinancialReport = async (request: FastifyRequest, reply: FastifyReply) => {
    const filter = sellerFinanceFilterSchema.parse(request.query || {});
    const report = await this.financeService.getFinancialReport(request.user.sub, filter);
    return reply.status(200).send({ data: report });
  };

  quickCreateVariation = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = quickCreateVariationSchema.parse(request.body);
    const result = await this.service.quickCreateVariation(request.user.sub, input);
    return reply.status(201).send({ data: result });
  };
}

