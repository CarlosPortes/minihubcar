import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { db } from '../../database/client';
import { appUser, role, userRole, sellerProfile, sellerAuthorization } from '../../database/schema';
import { UpdateProfileInput, AdminListUsersQuery } from './users.schemas';

export class UsersRepository {
  async findById(id: string) {
    const [user] = await db
      .select()
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);

    return user || null;
  }

  async findByNormalizedEmail(normalizedEmail: string) {
    const [user] = await db
      .select()
      .from(appUser)
      .where(eq(appUser.normalizedEmail, normalizedEmail))
      .limit(1);

    return user || null;
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

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const [updated] = await db
      .update(appUser)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, userId))
      .returning();

    return updated;
  }

  async updateEmail(userId: string, email: string, normalizedEmail: string) {
    const [updated] = await db
      .update(appUser)
      .set({
        email,
        normalizedEmail,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, userId))
      .returning();

    return updated;
  }

  async updatePassword(userId: string, passwordHash: string) {
    const [updated] = await db
      .update(appUser)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, userId))
      .returning();

    return updated;
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  async adminGetStats() {
    const [totalUsersRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser);

    const [activeUsersRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser)
      .where(eq(appUser.status, 'ACTIVE'));

    const [inactiveUsersRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser)
      .where(eq(appUser.status, 'INACTIVE'));

    const [homologatedSellersRes] = await db
      .select({ count: sql<number>`count(distinct ${sellerProfile.id})::int` })
      .from(sellerProfile)
      .innerJoin(sellerAuthorization, eq(sellerAuthorization.sellerId, sellerProfile.id))
      .where(and(eq(sellerAuthorization.status, 'APPROVED'), eq(sellerProfile.isActive, true)));

    return {
      totalUsers: totalUsersRes?.count || 0,
      activeUsers: activeUsersRes?.count || 0,
      inactiveUsers: inactiveUsersRes?.count || 0,
      homologatedSellers: homologatedSellersRes?.count || 0,
    };
  }

  async adminListUsers(params: AdminListUsersQuery) {
    const { page, limit, search, status, sellerStatus, role: roleFilter } = params;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Search filter (name, email)
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(sql`(LOWER(${appUser.name}) LIKE ${term} OR LOWER(${appUser.email}) LIKE ${term})`);
    }

    // Status filter
    if (status && status !== 'ALL') {
      conditions.push(eq(appUser.status, status));
    }

    // Role filter
    if (roleFilter && roleFilter !== 'ALL') {
      conditions.push(sql`${appUser.id} IN (
        SELECT ur.user_id FROM user_role ur
        INNER JOIN role r ON r.id = ur.role_id
        WHERE r.code = ${roleFilter}
      )`);
    }

    // Seller status filter
    if (sellerStatus === 'HOMOLOGATED') {
      conditions.push(sql`${appUser.id} IN (
        SELECT sp.user_id FROM seller_profile sp 
        INNER JOIN seller_authorization sa ON sa.seller_id = sp.id 
        WHERE sa.status = 'APPROVED' AND sp.is_active = true
      )`);
    } else if (sellerStatus === 'PENDING') {
      conditions.push(sql`${appUser.id} IN (
        SELECT sp.user_id FROM seller_profile sp 
        INNER JOIN seller_authorization sa ON sa.seller_id = sp.id 
        WHERE sa.status = 'PENDING'
      )`);
    } else if (sellerStatus === 'NON_SELLER') {
      conditions.push(sql`${appUser.id} NOT IN (
        SELECT sp.user_id FROM seller_profile sp
      )`);
    } else if (sellerStatus === 'REJECTED') {
      conditions.push(sql`${appUser.id} IN (
        SELECT sp.user_id FROM seller_profile sp 
        INNER JOIN seller_authorization sa ON sa.seller_id = sp.id 
        WHERE sa.status = 'REJECTED'
      )`);
    } else if (sellerStatus === 'SUSPENDED') {
      conditions.push(sql`${appUser.id} IN (
        SELECT sp.user_id FROM seller_profile sp 
        INNER JOIN seller_authorization sa ON sa.seller_id = sp.id 
        WHERE sa.status = 'SUSPENDED'
      )`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const [totalRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser)
      .where(whereClause);
    const total = totalRes?.count || 0;

    // Users page
    const users = await db
      .select({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        avatarUrl: appUser.avatarUrl,
        whatsapp: appUser.whatsapp,
        city: appUser.city,
        state: appUser.state,
        status: appUser.status,
        isCollectionPublic: appUser.isCollectionPublic,
        createdAt: appUser.createdAt,
        updatedAt: appUser.updatedAt,
      })
      .from(appUser)
      .where(whereClause)
      .orderBy(desc(appUser.createdAt))
      .limit(limit)
      .offset(offset);

    if (users.length === 0) {
      return {
        users: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    const userIds = users.map((u) => u.id);

    // Fetch user roles
    const rolesRows = await db
      .select({
        userId: userRole.userId,
        roleCode: role.code,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(inArray(userRole.userId, userIds));

    const rolesByUserId = new Map<string, string[]>();
    for (const r of rolesRows) {
      const list = rolesByUserId.get(r.userId) || [];
      list.push(r.roleCode);
      rolesByUserId.set(r.userId, list);
    }

    // Fetch seller profiles
    const sellerProfiles = await db
      .select({
        id: sellerProfile.id,
        userId: sellerProfile.userId,
        storeName: sellerProfile.storeName,
        slug: sellerProfile.slug,
        isActive: sellerProfile.isActive,
      })
      .from(sellerProfile)
      .where(inArray(sellerProfile.userId, userIds));

    const sellerByUserId = new Map<string, (typeof sellerProfiles)[0]>();
    const sellerIds: string[] = [];
    for (const sp of sellerProfiles) {
      sellerByUserId.set(sp.userId, sp);
      sellerIds.push(sp.id);
    }

    // Fetch latest seller authorizations
    const authBySellerId = new Map<string, { status: string; notes: string | null; reviewedAt: Date | null }>();
    if (sellerIds.length > 0) {
      const authRows = await db
        .select({
          sellerId: sellerAuthorization.sellerId,
          status: sellerAuthorization.status,
          notes: sellerAuthorization.notes,
          reviewedAt: sellerAuthorization.reviewedAt,
          createdAt: sellerAuthorization.createdAt,
        })
        .from(sellerAuthorization)
        .where(inArray(sellerAuthorization.sellerId, sellerIds))
        .orderBy(desc(sellerAuthorization.createdAt));

      for (const a of authRows) {
        if (!authBySellerId.has(a.sellerId)) {
          authBySellerId.set(a.sellerId, {
            status: a.status,
            notes: a.notes,
            reviewedAt: a.reviewedAt,
          });
        }
      }
    }

    const enrichedUsers = users.map((u) => {
      const sp = sellerByUserId.get(u.id);
      const auth = sp ? authBySellerId.get(sp.id) : null;
      const authStatus = auth?.status || (sp ? 'PENDING' : 'NONE');
      const isHomologated = authStatus === 'APPROVED' && sp?.isActive === true;

      return {
        ...u,
        roles: rolesByUserId.get(u.id) || ['COLLECTOR'],
        seller: {
          isSeller: !!sp,
          sellerId: sp?.id || null,
          storeName: sp?.storeName || null,
          slug: sp?.slug || null,
          isActive: sp?.isActive ?? null,
          authorizationStatus: authStatus,
          isHomologated,
          authorizationNotes: auth?.notes || null,
        },
      };
    });

    return {
      users: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async adminUpdateStatus(userId: string, status: string) {
    const [updated] = await db
      .update(appUser)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, userId))
      .returning({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        status: appUser.status,
        updatedAt: appUser.updatedAt,
      });

    return updated || null;
  }

  async adminUpdatePassword(userId: string, passwordHash: string) {
    const [updated] = await db
      .update(appUser)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, userId))
      .returning({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
      });

    return updated || null;
  }

  async adminUpdateRoles(userId: string, roleCodes: string[]) {
    return db.transaction(async (tx) => {
      const targetRoles = await tx
        .select({ id: role.id, code: role.code })
        .from(role)
        .where(inArray(role.code, roleCodes));

      await tx.delete(userRole).where(eq(userRole.userId, userId));

      if (targetRoles.length > 0) {
        await tx.insert(userRole).values(
          targetRoles.map((r) => ({
            userId,
            roleId: r.id,
          }))
        );
      }

      return targetRoles.map((r) => r.code);
    });
  }
}

