import { FastifyReply, FastifyRequest } from 'fastify';
import { AcquisitionsSalesService } from './acquisitions-sales.service';
import { recordAcquisitionSchema, recordSaleSchema, recordWriteOffSchema } from './acquisitions-sales.schemas';

export class AcquisitionsSalesController {
  constructor(private readonly service = new AcquisitionsSalesService()) {}

  listSales = async (request: FastifyRequest, reply: FastifyReply) => {
    const sales = await this.service.listSales(request.user.sub);
    return reply.status(200).send({ data: sales });
  };

  listAcquisitions = async (request: FastifyRequest, reply: FastifyReply) => {
    const acquisitions = await this.service.listAcquisitions(request.user.sub);
    return reply.status(200).send({ data: acquisitions });
  };

  recordSale = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = recordSaleSchema.parse(request.body);
    const result = await this.service.recordSale(request.user.sub, input);
    return reply.status(201).send({ data: result });
  };

  recordAcquisition = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = recordAcquisitionSchema.parse(request.body);
    const result = await this.service.recordAcquisition(request.user.sub, input);
    return reply.status(201).send({ data: result });
  };

  listWriteOffs = async (request: FastifyRequest, reply: FastifyReply) => {
    const writeOffs = await this.service.listWriteOffs(request.user.sub);
    return reply.status(200).send({ data: writeOffs });
  };

  recordWriteOff = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = recordWriteOffSchema.parse(request.body);
    const result = await this.service.recordWriteOff(request.user.sub, input);
    return reply.status(201).send({ data: result });
  };
}
