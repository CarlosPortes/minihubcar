import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import {
  subscriptionPlan,
  userSubscription,
  collectionExemplar,
  customCollectible,
  appUser,
} from '../../database/schema';
import { NotFoundError } from '../../shared/errors/api-error';
import {
  SubscribeInput,
  AdminListSubscriptionsQuery,
  AdminUpdateSubscriptionInput,
} from './subscriptions.schemas';

export class SubscriptionsService {
  async listPlans() {
    return db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.status, 'ACTIVE'))
      .orderBy(asc(subscriptionPlan.sortOrder));
  }

  async getUserSubscription(userId: string) {
    const [sub] = await db
      .select({
        id: userSubscription.id,
        userId: userSubscription.userId,
        status: userSubscription.status,
        billingCycle: userSubscription.billingCycle,
        paymentMethod: userSubscription.paymentMethod,
        startedAt: userSubscription.startedAt,
        expiresAt: userSubscription.expiresAt,
        autoRenew: userSubscription.autoRenew,
        plan: {
          id: subscriptionPlan.id,
          code: subscriptionPlan.code,
          name: subscriptionPlan.name,
          description: subscriptionPlan.description,
          monthlyPrice: subscriptionPlan.monthlyPrice,
          yearlyPrice: subscriptionPlan.yearlyPrice,
          maxMiniatures: subscriptionPlan.maxMiniatures,
          maxOtherCollectibles: subscriptionPlan.maxOtherCollectibles,
          features: subscriptionPlan.features,
          badge: subscriptionPlan.badge,
          isPopular: subscriptionPlan.isPopular,
        },
      })
      .from(userSubscription)
      .innerJoin(subscriptionPlan, eq(userSubscription.planId, subscriptionPlan.id))
      .where(eq(userSubscription.userId, userId))
      .limit(1);

    if (sub) {
      return sub;
    }

    // Default to FREE plan if no record exists
    const [freePlan] = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.code, 'FREE'))
      .limit(1);

    if (!freePlan) {
      throw new NotFoundError('Plano FREE não configurado');
    }

    const [created] = await db
      .insert(userSubscription)
      .values({
        userId,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        paymentMethod: 'FREE',
      })
      .returning();

    return {
      ...created,
      plan: freePlan,
    };
  }

  async checkUserLimits(userId: string) {
    const sub = await this.getUserSubscription(userId);
    const plan = sub.plan;

    // Count active miniatures
    const [miniaturesCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionExemplar)
      .where(and(eq(collectionExemplar.userId, userId), eq(collectionExemplar.status, 'ACTIVE')));

    const totalMiniatures = miniaturesCountRes?.count || 0;

    // Count active custom collectibles
    const [collectiblesCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customCollectible)
      .where(and(eq(customCollectible.userId, userId), eq(customCollectible.status, 'ACTIVE')));

    const totalCollectibles = collectiblesCountRes?.count || 0;

    const miniaturesMax = plan.maxMiniatures; // -1 means unlimited
    const miniaturesCanAdd = miniaturesMax === -1 || totalMiniatures < miniaturesMax;
    const miniaturesPercent =
      miniaturesMax === -1 ? 0 : Math.min(100, Math.round((totalMiniatures / miniaturesMax) * 100));

    const collectiblesMax = plan.maxOtherCollectibles; // -1 means unlimited
    const collectiblesCanAdd = collectiblesMax === -1 || totalCollectibles < collectiblesMax;
    const collectiblesPercent =
      collectiblesMax === -1 ? 0 : Math.min(100, Math.round((totalCollectibles / collectiblesMax) * 100));

    return {
      plan: {
        code: plan.code,
        name: plan.name,
        badge: plan.badge,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
      },
      subscription: {
        status: sub.status,
        billingCycle: sub.billingCycle,
        expiresAt: sub.expiresAt,
      },
      miniatures: {
        current: totalMiniatures,
        max: miniaturesMax,
        canAdd: miniaturesCanAdd,
        percentage: miniaturesPercent,
        remaining: miniaturesMax === -1 ? null : Math.max(0, miniaturesMax - totalMiniatures),
      },
      otherCollectibles: {
        current: totalCollectibles,
        max: collectiblesMax,
        canAdd: collectiblesCanAdd,
        percentage: collectiblesPercent,
        remaining: collectiblesMax === -1 ? null : Math.max(0, collectiblesMax - totalCollectibles),
      },
    };
  }

  async subscribe(userId: string, input: SubscribeInput) {
    const [targetPlan] = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.code, input.planCode))
      .limit(1);

    if (!targetPlan) {
      throw new NotFoundError(`Plano '${input.planCode}' não encontrado`);
    }

    // Calculate expiration if not free
    let expiresAt: Date | null = null;
    if (targetPlan.code !== 'FREE') {
      const now = new Date();
      if (input.billingCycle === 'YEARLY') {
        now.setFullYear(now.getFullYear() + 1);
      } else {
        now.setMonth(now.getMonth() + 1);
      }
      expiresAt = now;
    }

    // Upsert subscription
    const existing = await db
      .select({ id: userSubscription.id })
      .from(userSubscription)
      .where(eq(userSubscription.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(userSubscription)
        .set({
          planId: targetPlan.id,
          status: 'ACTIVE',
          billingCycle: input.billingCycle,
          paymentMethod: input.paymentMethod,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userSubscription.userId, userId))
        .returning();

      return {
        ...updated,
        plan: targetPlan,
        message: `Parabéns! Sua assinatura foi atualizada com sucesso para o plano ${targetPlan.name}.`,
      };
    } else {
      const [created] = await db
        .insert(userSubscription)
        .values({
          userId,
          planId: targetPlan.id,
          status: 'ACTIVE',
          billingCycle: input.billingCycle,
          paymentMethod: input.paymentMethod,
          expiresAt,
        })
        .returning();

      return {
        ...created,
        plan: targetPlan,
        message: `Parabéns! Sua assinatura foi ativada com sucesso no plano ${targetPlan.name}.`,
      };
    }
  }

  // =========================================================================
  // ADMIN METHODS (Painel de Gestão de Assinaturas & Cobranças)
  // =========================================================================

  async adminGetStats() {
    // 1. Total de usuários cadastrados
    const [totalUsersRes] = await db.select({ count: sql<number>`count(*)::int` }).from(appUser);
    const totalUsers = totalUsersRes?.count || 0;

    // 2. Planos configurados
    const plans = await db.select().from(subscriptionPlan).orderBy(asc(subscriptionPlan.sortOrder));

    // 3. Assinaturas existentes com detalhes do plano
    const subs = await db
      .select({
        status: userSubscription.status,
        billingCycle: userSubscription.billingCycle,
        monthlyPrice: subscriptionPlan.monthlyPrice,
        yearlyPrice: subscriptionPlan.yearlyPrice,
        planCode: subscriptionPlan.code,
        expiresAt: userSubscription.expiresAt,
      })
      .from(userSubscription)
      .innerJoin(subscriptionPlan, eq(userSubscription.planId, subscriptionPlan.id));

    let mrr = 0;
    let activePaidSubscribers = 0;
    let expiredSubscribers = 0;
    let expiringSoonCount = 0;
    const now = new Date();
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const countsByPlan: Record<string, number> = {
      FREE: 0,
      PRO: 0,
      MASTER: 0,
      LEGEND: 0,
    };

    for (const sub of subs) {
      countsByPlan[sub.planCode] = (countsByPlan[sub.planCode] || 0) + 1;

      if (sub.status === 'ACTIVE' && sub.planCode !== 'FREE') {
        activePaidSubscribers++;
        const mPrice = parseFloat(sub.monthlyPrice) || 0;
        const yPrice = parseFloat(sub.yearlyPrice) || 0;
        if (sub.billingCycle === 'YEARLY') {
          mrr += yPrice / 12;
        } else {
          mrr += mPrice;
        }
      }

      if (sub.status === 'EXPIRED') {
        expiredSubscribers++;
      }

      if (sub.status === 'ACTIVE' && sub.expiresAt) {
        const exp = new Date(sub.expiresAt);
        if (exp >= now && exp <= in7Days) {
          expiringSoonCount++;
        }
      }
    }

    // Usuários sem registro explícito em user_subscription são considerados FREE (Starter)
    const explicitSubCount = subs.length;
    countsByPlan['FREE'] = (countsByPlan['FREE'] || 0) + Math.max(0, totalUsers - explicitSubCount);

    return {
      mrr: Number(mrr.toFixed(2)),
      arr: Number((mrr * 12).toFixed(2)),
      totalUsers,
      activePaidSubscribers,
      expiredSubscribers,
      expiringSoonCount,
      countsByPlan,
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        subscribersCount: countsByPlan[p.code] || 0,
      })),
    };
  }

  async adminListSubscriptions(query: AdminListSubscriptionsQuery) {
    const { page, limit, search, planCode, status, billingCycle } = query;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(lower(${appUser.name}) LIKE ${term} OR lower(${appUser.email}) LIKE ${term})`
      );
    }

    if (planCode && planCode !== 'ALL') {
      if (planCode === 'FREE') {
        conditions.push(
          sql`(${subscriptionPlan.code} = 'FREE' OR ${userSubscription.id} IS NULL)`
        );
      } else {
        conditions.push(eq(subscriptionPlan.code, planCode));
      }
    }

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        conditions.push(
          sql`(${userSubscription.status} = 'ACTIVE' OR ${userSubscription.id} IS NULL)`
        );
      } else {
        conditions.push(eq(userSubscription.status, status));
      }
    }

    if (billingCycle && billingCycle !== 'ALL') {
      conditions.push(eq(userSubscription.billingCycle, billingCycle));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total matching
    const [countRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appUser)
      .leftJoin(userSubscription, eq(appUser.id, userSubscription.userId))
      .leftJoin(subscriptionPlan, eq(userSubscription.planId, subscriptionPlan.id))
      .where(whereClause);

    const total = countRes?.count || 0;

    // Fetch matching users and their subscriptions
    const rows = await db
      .select({
        userId: appUser.id,
        userName: appUser.name,
        userEmail: appUser.email,
        userAvatarUrl: appUser.avatarUrl,
        userStatus: appUser.status,
        userWhatsapp: appUser.whatsapp,
        subscriptionId: userSubscription.id,
        status: sql<string>`coalesce(${userSubscription.status}, 'ACTIVE')`,
        billingCycle: sql<string>`coalesce(${userSubscription.billingCycle}, 'MONTHLY')`,
        paymentMethod: sql<string>`coalesce(${userSubscription.paymentMethod}, 'FREE')`,
        startedAt: sql<Date | null>`coalesce(${userSubscription.startedAt}, ${appUser.createdAt})`,
        expiresAt: userSubscription.expiresAt,
        autoRenew: sql<boolean>`coalesce(${userSubscription.autoRenew}, true)`,
        planId: subscriptionPlan.id,
        planCode: sql<string>`coalesce(${subscriptionPlan.code}, 'FREE')`,
        planName: sql<string>`coalesce(${subscriptionPlan.name}, 'Starter')`,
        monthlyPrice: sql<string>`coalesce(${subscriptionPlan.monthlyPrice}, '0.00')`,
        yearlyPrice: sql<string>`coalesce(${subscriptionPlan.yearlyPrice}, '0.00')`,
        maxMiniatures: sql<number>`coalesce(${subscriptionPlan.maxMiniatures}, 200)`,
        maxOtherCollectibles: sql<number>`coalesce(${subscriptionPlan.maxOtherCollectibles}, 15)`,
      })
      .from(appUser)
      .leftJoin(userSubscription, eq(appUser.id, userSubscription.userId))
      .leftJoin(subscriptionPlan, eq(userSubscription.planId, subscriptionPlan.id))
      .where(whereClause)
      .orderBy(desc(userSubscription.startedAt), desc(appUser.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch item counts in batch
    const userIds = rows.map((r) => r.userId);
    const miniaturesCountMap = new Map<string, number>();
    const collectiblesCountMap = new Map<string, number>();

    if (userIds.length > 0) {
      const minCounts = await db
        .select({
          userId: collectionExemplar.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(collectionExemplar)
        .where(
          and(
            sql`${collectionExemplar.userId} IN ${userIds}`,
            eq(collectionExemplar.status, 'ACTIVE')
          )
        )
        .groupBy(collectionExemplar.userId);

      for (const mc of minCounts) {
        miniaturesCountMap.set(mc.userId, mc.count);
      }

      const colCounts = await db
        .select({
          userId: customCollectible.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(customCollectible)
        .where(
          and(
            sql`${customCollectible.userId} IN ${userIds}`,
            eq(customCollectible.status, 'ACTIVE')
          )
        )
        .groupBy(customCollectible.userId);

      for (const cc of colCounts) {
        collectiblesCountMap.set(cc.userId, cc.count);
      }
    }

    const data = rows.map((r) => ({
      id: r.subscriptionId || `auto-${r.userId}`,
      userId: r.userId,
      user: {
        id: r.userId,
        name: r.userName,
        email: r.userEmail,
        avatarUrl: r.userAvatarUrl,
        status: r.userStatus,
        whatsapp: r.userWhatsapp,
      },
      plan: {
        id: r.planId,
        code: r.planCode,
        name: r.planName,
        monthlyPrice: r.monthlyPrice,
        yearlyPrice: r.yearlyPrice,
        maxMiniatures: r.maxMiniatures,
        maxOtherCollectibles: r.maxOtherCollectibles,
      },
      status: r.status,
      billingCycle: r.billingCycle,
      paymentMethod: r.paymentMethod,
      startedAt: r.startedAt,
      expiresAt: r.expiresAt,
      autoRenew: r.autoRenew,
      usage: {
        miniaturesCount: miniaturesCountMap.get(r.userId) || 0,
        collectiblesCount: collectiblesCountMap.get(r.userId) || 0,
      },
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdateSubscription(targetUserId: string, input: AdminUpdateSubscriptionInput) {
    const user = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.id, targetUserId)).limit(1);
    if (!user.length) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Find current user subscription
    const [sub] = await db
      .select()
      .from(userSubscription)
      .where(eq(userSubscription.userId, targetUserId))
      .limit(1);

    // If target planCode provided
    let newPlanId = sub?.planId;
    if (input.planCode) {
      const [targetPlan] = await db
        .select()
        .from(subscriptionPlan)
        .where(eq(subscriptionPlan.code, input.planCode))
        .limit(1);
      if (!targetPlan) {
        throw new NotFoundError(`Plano ${input.planCode} não encontrado`);
      }
      newPlanId = targetPlan.id;
    } else if (!newPlanId) {
      const [freePlan] = await db.select().from(subscriptionPlan).where(eq(subscriptionPlan.code, 'FREE')).limit(1);
      newPlanId = freePlan?.id;
    }

    // Handle expiration calculation or extension
    let newExpiresAt = sub?.expiresAt;
    if (input.expiresAt !== undefined) {
      newExpiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    } else if (input.extendDays && input.extendDays > 0) {
      const baseDate = sub?.expiresAt && new Date(sub.expiresAt) > new Date()
        ? new Date(sub.expiresAt)
        : new Date();
      baseDate.setDate(baseDate.getDate() + input.extendDays);
      newExpiresAt = baseDate;
    }

    const newStatus = input.status || (sub?.status ?? 'ACTIVE');
    const newBillingCycle = input.billingCycle || (sub?.billingCycle ?? 'MONTHLY');
    const newPaymentMethod = input.paymentMethod || (sub?.paymentMethod ?? (input.planCode === 'FREE' ? 'FREE' : 'MANUAL'));

    if (sub) {
      const [updated] = await db
        .update(userSubscription)
        .set({
          planId: newPlanId!,
          status: newStatus,
          billingCycle: newBillingCycle,
          paymentMethod: newPaymentMethod,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userSubscription.id, sub.id))
        .returning();

      return updated;
    } else {
      const [created] = await db
        .insert(userSubscription)
        .values({
          userId: targetUserId,
          planId: newPlanId!,
          status: newStatus,
          billingCycle: newBillingCycle,
          paymentMethod: newPaymentMethod,
          expiresAt: newExpiresAt,
        })
        .returning();

      return created;
    }
  }
}

export const subscriptionsService = new SubscriptionsService();
