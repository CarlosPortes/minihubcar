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
  let roles = request.user?.roles || [];
  if (!roles.includes('CATALOG_ADMIN') && !roles.includes('SYSTEM_ADMIN')) {
    if (request.user?.sub) {
      const { eq } = await import('drizzle-orm');
      const { db } = await import('../../database/client');
      const { userRole, role } = await import('../../database/schema');
      const userRoles = await db
        .select({ code: role.code })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(eq(userRole.userId, request.user.sub));
      roles = userRoles.map((r) => r.code);
      if (roles.includes('CATALOG_ADMIN') || roles.includes('SYSTEM_ADMIN')) {
        request.user.roles = roles;
        return;
      }
    }
    throw new ForbiddenError('Acesso restrito a administradores');
  }
}

