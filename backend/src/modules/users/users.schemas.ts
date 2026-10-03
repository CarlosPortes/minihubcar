import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(150).optional(),
  avatarUrl: z.string().max(500).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  street: z.string().max(255).optional().nullable(),
  number: z.string().max(50).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  isCollectionPublic: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateEmailSchema = z.object({
  newEmail: z.string().email('E-mail inválido').max(320),
  currentPassword: z.string().min(1, 'Senha atual é obrigatória para confirmação de segurança'),
});

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// Admin Schemas
export const adminUserIdParamSchema = z.object({
  id: z.string().uuid('ID de usuário inválido'),
});

export const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
  sellerStatus: z.enum(['ALL', 'HOMOLOGATED', 'PENDING', 'NON_SELLER', 'REJECTED', 'SUSPENDED']).default('ALL'),
  role: z.string().optional(),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const adminUpdateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>;

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres').optional(),
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

export const adminUpdateUserRolesSchema = z.object({
  roles: z.array(z.string()).min(1, 'Pelo menos uma função deve ser atribuída'),
});

export type AdminUpdateUserRolesInput = z.infer<typeof adminUpdateUserRolesSchema>;
