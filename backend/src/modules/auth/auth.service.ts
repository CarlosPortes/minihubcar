import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { AuthRepository } from './auth.repository';
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from './auth.schemas';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../shared/errors/api-error';

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async register(input: RegisterInput, app: FastifyInstance) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findByNormalizedEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('Este e-mail já está cadastrado no MiniHub Car');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await this.authRepository.createUser({
      name: input.name.trim(),
      email: input.email.trim(),
      normalizedEmail,
      passwordHash,
      isCollectionPublic: input.isCollectionPublic,
    });

    const roles = await this.authRepository.getUserRoles(user.id);

    const accessToken = app.jwt.sign(
      { sub: user.id, email: user.email, roles },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, tokenType: 'refresh' },
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        isCollectionPublic: user.isCollectionPublic,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput, app: FastifyInstance) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.authRepository.findByNormalizedEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Esta conta está inativa ou bloqueada');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    const roles = await this.authRepository.getUserRoles(user.id);

    const accessToken = app.jwt.sign(
      { sub: user.id, email: user.email, roles },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { sub: user.id, tokenType: 'refresh' },
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles,
        isCollectionPublic: user.isCollectionPublic,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, app: FastifyInstance) {
    try {
      const decoded = app.jwt.verify<{ sub: string; tokenType?: string }>(refreshToken);
      if (decoded.tokenType !== 'refresh') {
        throw new UnauthorizedError('Token de atualização inválido');
      }

      const user = await this.authRepository.findById(decoded.sub);
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedError('Usuário não encontrado ou inativo');
      }

      const roles = await this.authRepository.getUserRoles(user.id);

      const newAccessToken = app.jwt.sign(
        { sub: user.id, email: user.email, roles },
        { expiresIn: '15m' }
      );

      const newRefreshToken = app.jwt.sign(
        { sub: user.id, tokenType: 'refresh' },
        { expiresIn: '7d' }
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles,
          isCollectionPublic: user.isCollectionPublic,
        },
      };
    } catch {
      throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
    }
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    const roles = await this.authRepository.getUserRoles(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      roles,
    };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.authRepository.findByNormalizedEmail(normalizedEmail);

    if (user && user.status === 'ACTIVE') {
      const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.authRepository.createPasswordResetToken(user.id, rawToken, expiresAt);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      // Prominent server log (always works in dev and production fallback)
      console.log('🔑 ==========================================');
      console.log(`🔑 RECUPERAÇÃO DE SENHA PARA: ${user.email}`);
      console.log(`🔗 LINK DE REDEFINIÇÃO: ${resetLink}`);
      console.log('🔑 ==========================================');
    }

    // Neutral message prevents user enumeration
    return {
      message: 'Se este e-mail estiver cadastrado na plataforma, as instruções de recuperação foram enviadas.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenRecord = await this.authRepository.findPasswordResetToken(input.token);

    if (!tokenRecord || tokenRecord.isUsed) {
      throw new BadRequestError('Link de recuperação inválido ou já utilizado.');
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new BadRequestError('Este link de recuperação expirou. Por favor, solicite um novo.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.newPassword, salt);

    await this.authRepository.updateUserPassword(tokenRecord.userId, passwordHash);
    await this.authRepository.markTokenUsed(tokenRecord.id);

    return {
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com sua nova senha.',
    };
  }
}
