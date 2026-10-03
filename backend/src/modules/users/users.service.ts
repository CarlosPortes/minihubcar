import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { UsersRepository } from './users.repository';
import {
  UpdateEmailInput,
  UpdatePasswordInput,
  UpdateProfileInput,
  AdminListUsersQuery,
  AdminUpdateUserStatusInput,
  AdminResetPasswordInput,
  AdminUpdateUserRolesInput,
} from './users.schemas';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/api-error';
import { ROLES } from '../../config/constants';

export class UsersService {
  constructor(private readonly repository = new UsersRepository()) {}

  async getProfile(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const roles = await this.repository.getUserRoles(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      whatsapp: user.whatsapp,
      instagram: user.instagram,
      website: user.website,
      postalCode: user.postalCode,
      street: user.street,
      number: user.number,
      complement: user.complement,
      neighborhood: user.neighborhood,
      city: user.city,
      state: user.state,
      status: user.status,
      isCollectionPublic: user.isCollectionPublic,
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updated = await this.repository.updateProfile(userId, {
      name: input.name !== undefined ? input.name.trim() : undefined,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
      whatsapp: input.whatsapp !== undefined ? input.whatsapp : undefined,
      instagram: input.instagram !== undefined ? input.instagram : undefined,
      website: input.website !== undefined ? input.website : undefined,
      postalCode: input.postalCode !== undefined ? input.postalCode : undefined,
      street: input.street !== undefined ? input.street : undefined,
      number: input.number !== undefined ? input.number : undefined,
      complement: input.complement !== undefined ? input.complement : undefined,
      neighborhood: input.neighborhood !== undefined ? input.neighborhood : undefined,
      city: input.city !== undefined ? input.city : undefined,
      state: input.state !== undefined ? input.state : undefined,
      isCollectionPublic: input.isCollectionPublic !== undefined ? input.isCollectionPublic : undefined,
    });

    if (!updated) {
      throw new NotFoundError('Falha ao atualizar dados do usuário');
    }

    const roles = await this.repository.getUserRoles(user.id);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      whatsapp: updated.whatsapp,
      instagram: updated.instagram,
      website: updated.website,
      postalCode: updated.postalCode,
      street: updated.street,
      number: updated.number,
      complement: updated.complement,
      neighborhood: updated.neighborhood,
      city: updated.city,
      state: updated.state,
      status: updated.status,
      isCollectionPublic: updated.isCollectionPublic,
      roles,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateEmail(userId: string, input: UpdateEmailInput, app: FastifyInstance) {
    const user = await this.repository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Security check: verify current password
    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('A senha atual informada está incorreta');
    }

    const normalizedEmail = input.newEmail.trim().toLowerCase();

    if (normalizedEmail === user.normalizedEmail) {
      throw new BadRequestError('O novo e-mail informado é idêntico ao e-mail atual');
    }

    const existing = await this.repository.findByNormalizedEmail(normalizedEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictError('Este e-mail já está sendo utilizado por outra conta');
    }

    const updated = await this.repository.updateEmail(userId, input.newEmail.trim(), normalizedEmail);
    if (!updated) {
      throw new NotFoundError('Falha ao atualizar e-mail do usuário');
    }

    const roles = await this.repository.getUserRoles(user.id);

    // Generate fresh tokens with updated email
    const accessToken = app.jwt.sign(
      { sub: updated.id, email: updated.email, roles },
      { expiresIn: '15m' }
    );

    const refreshToken = app.jwt.sign(
      { sub: updated.id, tokenType: 'refresh' },
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        roles,
      },
      accessToken,
      refreshToken,
    };
  }

  async updatePassword(userId: string, input: UpdatePasswordInput) {
    const user = await this.repository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('A senha atual informada está incorreta');
    }

    const isSamePassword = await bcrypt.compare(input.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestError('A nova senha não pode ser igual à senha atual');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.newPassword, salt);

    await this.repository.updatePassword(userId, passwordHash);

    return { message: 'Senha atualizada com sucesso' };
  }

  // ==========================================
  // ADMIN SERVICE METHODS
  // ==========================================

  async adminGetStats() {
    return this.repository.adminGetStats();
  }

  async adminListUsers(query: AdminListUsersQuery) {
    return this.repository.adminListUsers(query);
  }

  async adminUpdateStatus(adminUserId: string, targetUserId: string, input: AdminUpdateUserStatusInput) {
    const user = await this.repository.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (adminUserId === targetUserId && input.status === 'INACTIVE') {
      throw new BadRequestError('Você não pode desativar seu próprio usuário administrador.');
    }

    const updated = await this.repository.adminUpdateStatus(targetUserId, input.status);
    if (!updated) {
      throw new NotFoundError('Falha ao atualizar status do usuário');
    }

    return {
      message: `Status do usuário atualizado para ${input.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}`,
      user: updated,
    };
  }

  async adminResetPassword(targetUserId: string, input: AdminResetPasswordInput) {
    const user = await this.repository.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    let passwordToSet = input.newPassword?.trim();
    if (!passwordToSet) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const randomSuffix = crypto.randomBytes(2).toString('hex');
      passwordToSet = `MiniHub#${randomDigits}!${randomSuffix}`;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordToSet, salt);

    const updated = await this.repository.adminUpdatePassword(targetUserId, passwordHash);
    if (!updated) {
      throw new NotFoundError('Falha ao redefinir senha do usuário');
    }

    return {
      message: 'Senha do usuário redefinida com sucesso',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
      },
      temporaryPassword: passwordToSet,
    };
  }

  async adminUpdateRoles(adminUserId: string, targetUserId: string, input: AdminUpdateUserRolesInput) {
    const user = await this.repository.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const validRoles = Object.values(ROLES) as string[];
    for (const r of input.roles) {
      if (!validRoles.includes(r)) {
        throw new BadRequestError(`Função inválida informada: ${r}`);
      }
    }

    if (adminUserId === targetUserId) {
      const hasAdmin = input.roles.includes('SYSTEM_ADMIN') || input.roles.includes('CATALOG_ADMIN');
      if (!hasAdmin) {
        throw new BadRequestError('Você não pode remover todos os seus privilégios de administrador.');
      }
    }

    const updatedRoles = await this.repository.adminUpdateRoles(targetUserId, input.roles);

    return {
      message: 'Funções do usuário atualizadas com sucesso',
      roles: updatedRoles,
    };
  }
}

