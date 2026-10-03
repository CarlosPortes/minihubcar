import { FastifyReply, FastifyRequest } from 'fastify';
import { importExportService } from './import-export.service';
import { BadRequestError } from '../../shared/errors/api-error';

export class ImportExportController {
  downloadTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.params as { type: string };
    if (type !== 'locations' && type !== 'collection') {
      throw new BadRequestError("Tipo de template inválido. Utilize 'locations' ou 'collection'.");
    }

    const csvData = importExportService.generateTemplate(type);
    const filename =
      type === 'locations'
        ? 'template_locais_minihubcar.csv'
        : 'template_colecao_minihubcar.csv';

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csvData);
  };

  importLocations = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const body = request.body as any;

    let result;
    if (body?.csvText && typeof body.csvText === 'string') {
      result = await importExportService.importLocations(user.sub, body.csvText);
    } else if (Array.isArray(body?.items)) {
      result = await importExportService.importLocations(user.sub, body.items);
    } else if (typeof body === 'string') {
      result = await importExportService.importLocations(user.sub, body);
    } else {
      throw new BadRequestError('Corpo da requisição deve conter `items` (array) ou `csvText` (string).');
    }

    return reply.status(200).send({ data: result });
  };

  importLocationsFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const file = await request.file();
    if (!file) {
      throw new BadRequestError('Nenhum arquivo enviado.');
    }

    const buffer = await file.toBuffer();
    const csvText = buffer.toString('utf-8');
    const result = await importExportService.importLocations(user.sub, csvText);

    return reply.status(200).send({ data: result });
  };

  importCollection = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const body = request.body as any;

    let result;
    if (body?.csvText && typeof body.csvText === 'string') {
      result = await importExportService.importCollection(user.sub, body.csvText);
    } else if (Array.isArray(body?.items)) {
      result = await importExportService.importCollection(user.sub, body.items);
    } else if (typeof body === 'string') {
      result = await importExportService.importCollection(user.sub, body);
    } else {
      throw new BadRequestError('Corpo da requisição deve conter `items` (array) ou `csvText` (string).');
    }

    return reply.status(200).send({ data: result });
  };

  importCollectionFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string };
    const file = await request.file();
    if (!file) {
      throw new BadRequestError('Nenhum arquivo enviado.');
    }

    const buffer = await file.toBuffer();
    const csvText = buffer.toString('utf-8');
    const result = await importExportService.importCollection(user.sub, csvText);

    return reply.status(200).send({ data: result });
  };
}

export const importExportController = new ImportExportController();
