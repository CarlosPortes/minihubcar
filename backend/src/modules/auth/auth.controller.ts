import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schemas';
import { UnauthorizedError } from '../../shared/errors/api-error';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  register = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = registerSchema.parse(request.body);
    const result = await this.authService.register(input, request.server);

    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = loginSchema.parse(request.body);
    const result = await this.authService.login(input, request.server);

    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(200).send({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Sessão não encontrada');
    }

    const result = await this.authService.refresh(refreshToken, request.server);

    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.status(200).send({
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  };

  logout = async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' });
    return reply.status(200).send({ data: { message: 'Logout realizado com sucesso' } });
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await this.authService.getMe(request.user.sub);
    return reply.status(200).send({ data: user });
  };

  forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await this.authService.forgotPassword(input);
    return reply.status(200).send({ data: result });
  };

  resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = resetPasswordSchema.parse(request.body);
    const result = await this.authService.resetPassword(input);
    return reply.status(200).send({ data: result });
  };
}
