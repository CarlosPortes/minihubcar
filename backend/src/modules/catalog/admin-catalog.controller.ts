import { FastifyReply, FastifyRequest } from 'fastify';
import { AdminCatalogService } from './admin-catalog.service';
import {
  createAutomakerSchema,
  updateAutomakerSchema,
  createVehicleModelSchema,
  updateVehicleModelSchema,
  createMiniatureBrandSchema,
  updateMiniatureBrandSchema,
  createSeriesSchema,
  updateSeriesSchema,
  createScaleSchema,
  updateScaleSchema,
  createCatalogVariationSchema,
  updateCatalogVariationSchema,
} from './admin-catalog.schemas';


export class AdminCatalogController {
  constructor(private readonly service = new AdminCatalogService()) {}

  // Automakers
  listAutomakers = async (_req: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listAutomakers();
    return reply.status(200).send({ data: list });
  };

  createAutomaker = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createAutomakerSchema.parse(req.body);
    const created = await this.service.createAutomaker(input);
    return reply.status(201).send({ data: created });
  };

  // Vehicle Models
  listVehicleModels = async (req: FastifyRequest, reply: FastifyReply) => {
    const { automakerId } = req.query as { automakerId?: string };
    const list = await this.service.listVehicleModels(automakerId);
    return reply.status(200).send({ data: list });
  };

  createVehicleModel = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createVehicleModelSchema.parse(req.body);
    const created = await this.service.createVehicleModel(input);
    return reply.status(201).send({ data: created });
  };

  // Miniature Brands
  listBrands = async (_req: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listMiniatureBrands();
    return reply.status(200).send({ data: list });
  };

  createBrand = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createMiniatureBrandSchema.parse(req.body);
    const created = await this.service.createMiniatureBrand(input);
    return reply.status(201).send({ data: created });
  };

  // Series
  listSeries = async (req: FastifyRequest, reply: FastifyReply) => {
    const { brandId } = req.query as { brandId?: string };
    const list = await this.service.listSeries(brandId);
    return reply.status(200).send({ data: list });
  };

  createSeries = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createSeriesSchema.parse(req.body);
    const created = await this.service.createSeries(input);
    return reply.status(201).send({ data: created });
  };

  // Scales
  listScales = async (_req: FastifyRequest, reply: FastifyReply) => {
    const list = await this.service.listScales();
    return reply.status(200).send({ data: list });
  };

  createScale = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createScaleSchema.parse(req.body);
    const created = await this.service.createScale(input);
    return reply.status(201).send({ data: created });
  };

  // Create Catalog Variation
  createVariation = async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createCatalogVariationSchema.parse(req.body);
    const created = await this.service.createCatalogVariation(input);
    return reply.status(201).send({ data: created });
  };

  // Update Catalog Variation
  updateVariation = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateCatalogVariationSchema.parse(req.body);
    const updated = await this.service.updateCatalogVariation(id, input);
    return reply.status(200).send({ data: updated });
  };

  // Update Automaker
  updateAutomaker = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateAutomakerSchema.parse(req.body);
    const updated = await this.service.updateAutomaker(id, input);
    return reply.status(200).send({ data: updated });
  };

  // Update Vehicle Model
  updateVehicleModel = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateVehicleModelSchema.parse(req.body);
    const updated = await this.service.updateVehicleModel(id, input);
    return reply.status(200).send({ data: updated });
  };

  // Update Brand
  updateBrand = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateMiniatureBrandSchema.parse(req.body);
    const updated = await this.service.updateMiniatureBrand(id, input);
    return reply.status(200).send({ data: updated });
  };

  // Update Series
  updateSeries = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateSeriesSchema.parse(req.body);
    const updated = await this.service.updateSeries(id, input);
    return reply.status(200).send({ data: updated });
  };

  // Update Scale
  updateScale = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const input = updateScaleSchema.parse(req.body);
    const updated = await this.service.updateScale(id, input);
    return reply.status(200).send({ data: updated });
  };
}

