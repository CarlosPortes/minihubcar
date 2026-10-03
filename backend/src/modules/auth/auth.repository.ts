import { eq, and } from 'drizzle-orm';
import { db } from '../../database/client';
import { appUser, role, userRole, passwordResetToken } from '../../database/schema';

export class AuthRepository {
  async findByNormalizedEmail(normalizedEmail: string) {
    const rows = await db
      .select()
      .from(appUser)
      .where(eq(appUser.normalizedEmail, normalizedEmail))
      .limit(1);

    return rows[0] || null;
  }

  async findById(id: string) {
    const rows = await db
      .select({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        avatarUrl: appUser.avatarUrl,
        status: appUser.status,
        isCollectionPublic: appUser.isCollectionPublic,
        createdAt: appUser.createdAt,
      })
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);

    return rows[0] || null;
  }

  async createUser(data: {
    name: string;
    email: string;
    normalizedEmail: string;
    passwordHash: string;
    isCollectionPublic?: boolean;
  }) {
    const [user] = await db
      .insert(appUser)
      .values({
        name: data.name,
        email: data.email,
        normalizedEmail: data.normalizedEmail,
        passwordHash: data.passwordHash,
        status: 'ACTIVE',
        isCollectionPublic: data.isCollectionPublic !== undefined ? data.isCollectionPublic : true,
      })
      .returning();

    if (!user) {
      throw new Error('Falha ao criar usuário');
    }

    // Assign default role COLLECTOR
    const [collectorRole] = await db
      .select()
      .from(role)
      .where(eq(role.code, 'COLLECTOR'))
      .limit(1);

    if (collectorRole) {
      await db.insert(userRole).values({
        userId: user.id,
        roleId: collectorRole.id,
      });
    }

    return user;
  }

  async getUserRoles(userId: string) {
    const rows = await db
      .select({
        roleCode: role.code,
        roleName: role.name,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, userId));

    return rows.map((r) => r.roleCode);
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    // Invalidate previous active tokens for this user
    await db
      .update(passwordResetToken)
      .set({ isUsed: true })
      .where(and(eq(passwordResetToken.userId, userId), eq(passwordResetToken.isUsed, false)));

    const [created] = await db
      .insert(passwordResetToken)
      .values({
        userId,
        token,
        expiresAt,
        isUsed: false,
      })
      .returning();

    return created;
  }

  async findPasswordResetToken(token: string) {
    const rows = await db
      .select()
      .from(passwordResetToken)
      .where(eq(passwordResetToken.token, token))
      .limit(1);

    return rows[0] || null;
  }

  async markTokenUsed(tokenId: string) {
    await db
      .update(passwordResetToken)
      .set({ isUsed: true })
      .where(eq(passwordResetToken.id, tokenId));
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    await db
      .update(appUser)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(appUser.id, userId));
  }
}
