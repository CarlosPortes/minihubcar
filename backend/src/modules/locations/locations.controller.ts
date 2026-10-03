import { FastifyReply, FastifyRequest } from 'fastify';
import { LocationsService } from './locations.service';
import { createLocationSchema, locationParamSchema, updateLocationSchema } from './locations.schemas';

export class LocationsController {
  constructor(private readonly locationsService = new LocationsService()) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const locations = await this.locationsService.getUserLocations(request.user.sub);
    return reply.status(200).send({ data: locations });
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = createLocationSchema.parse(request.body);
    const location = await this.locationsService.createLocation(request.user.sub, input);
    return reply.status(201).send({ data: location });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = locationParamSchema.parse(request.params);
    const input = updateLocationSchema.parse(request.body);
    const updated = await this.locationsService.updateLocation(id, request.user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  getGrid = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = locationParamSchema.parse(request.params);
    const gridData = await this.locationsService.getLocationGrid(id, request.user.sub);
    return reply.status(200).send({ data: gridData });
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = locationParamSchema.parse(request.params);
    const archived = await this.locationsService.archiveLocation(id, request.user.sub);
    return reply.status(200).send({ data: archived });
  };
}
