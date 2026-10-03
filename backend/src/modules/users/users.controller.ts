import { FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from './users.service';
import {
  updateEmailSchema,
  updatePasswordSchema,
  updateProfileSchema,
  adminUserIdParamSchema,
  adminListUsersQuerySchema,
  adminUpdateUserStatusSchema,
  adminResetPasswordSchema,
  adminUpdateUserRolesSchema,
} from './users.schemas';

export class UsersController {
  constructor(private readonly service = new UsersService()) {}

  getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const profile = await this.service.getProfile(request.user.sub);
    return reply.status(200).send({ data: profile });
  };

  updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = updateProfileSchema.parse(request.body);
    const updated = await this.service.updateProfile(request.user.sub, input);
    return reply.status(200).send({ data: updated });
  };

  updateEmail = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = updateEmailSchema.parse(request.body);
    const result = await this.service.updateEmail(request.user.sub, input, request.server);

    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({ data: result });
  };

  updatePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = updatePasswordSchema.parse(request.body);
    const result = await this.service.updatePassword(request.user.sub, input);
    return reply.status(200).send({ data: result });
  };

  // ==========================================
  // ADMIN CONTROLLER METHODS
  // ==========================================

  adminGetStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await this.service.adminGetStats();
    return reply.status(200).send({ data: stats });
  };

  adminListUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = adminListUsersQuerySchema.parse(request.query || {});
    const result = await this.service.adminListUsers(query);
    return reply.status(200).send({ data: result });
  };

  adminUpdateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = adminUserIdParamSchema.parse(request.params);
    const input = adminUpdateUserStatusSchema.parse(request.body);
    const result = await this.service.adminUpdateStatus(request.user.sub, id, input);
    return reply.status(200).send({ data: result });
  };

  adminResetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = adminUserIdParamSchema.parse(request.params);
    const input = adminResetPasswordSchema.parse(request.body || {});
    const result = await this.service.adminResetPassword(id, input);
    return reply.status(200).send({ data: result });
  };

  adminUpdateRoles = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = adminUserIdParamSchema.parse(request.params);
    const input = adminUpdateUserRolesSchema.parse(request.body);
    const result = await this.service.adminUpdateRoles(request.user.sub, id, input);
    return reply.status(200).send({ data: result });
  };
}

