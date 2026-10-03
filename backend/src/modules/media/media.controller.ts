import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { db } from '../../database/client';
import { photo, exemplarPhoto } from '../../database/schema';
import { BadRequestError, NotFoundError } from '../../shared/errors/api-error';
import { env } from '../../config/env';

export class MediaController {
  upload = async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      throw new BadRequestError('Nenhum arquivo enviado');
    }

    const uploadsDir = path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.filename) || '.jpg';
    const storageKey = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, storageKey);

    await pipeline(file.file, fs.createWriteStream(filePath));

    const publicUrl = `/uploads/${storageKey}`;

    const [newPhoto] = await db
      .insert(photo)
      .values({
        storageKey,
        url: publicUrl,
        mimeType: file.mimetype,
      })
      .returning();

    return reply.status(201).send({
      data: {
        id: newPhoto?.id,
        url: publicUrl,
        storageKey,
      },
    });
  };

  attachToExemplar = async (request: FastifyRequest, reply: FastifyReply) => {
    const { exemplarId } = request.params as { exemplarId: string };
    const body = request.body as { photoId: string; isPrimary?: boolean; sortOrder?: number };

    if (!body?.photoId) {
      throw new BadRequestError('photoId é obrigatório');
    }

    const [attached] = await db
      .insert(exemplarPhoto)
      .values({
        exemplarId,
        photoId: body.photoId,
        isPrimary: body.isPrimary || false,
        sortOrder: body.sortOrder || 0,
      })
      .returning();

    return reply.status(201).send({ data: attached });
  };
}
