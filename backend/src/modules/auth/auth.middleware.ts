import { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/api-error';

export interface AuthenticatedUser {
  sub: string;
  email?: string;
  roles?: string[];
  tokenType?: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: {
      sub: string;
      email: string;
      roles: string[];
      tokenType?: string;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<{ sub: string; email: string; roles: string[] }>();
    request.user = payload;
  } catch {
    throw new UnauthorizedError('Token de acesso ausente ou inválido');
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const roles = request.user?.roles || [];
  if (!roles.includes('CATALOG_ADMIN') && !roles.includes('SYSTEM_ADMIN')) {
    throw new ForbiddenError('Acesso restrito a administradores');
  }
}
