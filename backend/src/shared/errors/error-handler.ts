import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ApiError } from './api-error.js';

export const errorHandler = (
  error: FastifyError | ApiError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = (request.headers['x-request-id'] as string) || request.id;
  const timestamp = new Date().toISOString();

  // Zod Validation Error
  if (error instanceof ZodError) {
    const formattedDetails = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      rule: issue.code,
    }));

    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados enviados na requisição são inválidos',
        details: formattedDetails,
      },
      meta: {
        requestId,
        timestamp,
      },
    });
  }

  // Custom Domain ApiError
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        requestId,
        timestamp,
      },
    });
  }

  // Fastify schema validation error
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation,
      },
      meta: {
        requestId,
        timestamp,
      },
    });
  }

  // Fastify standard 4xx errors
  if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code || 'BAD_REQUEST',
        message: error.message,
      },
      meta: {
        requestId,
        timestamp,
      },
    });
  }

  // Unexpected internal server error
  console.error('UNHANDLED SERVER ERROR:', error);
  request.log.error({ err: error, requestId }, 'Unhandled exception');

  return reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
    },
    meta: {
      requestId,
      timestamp,
    },
  });
};
