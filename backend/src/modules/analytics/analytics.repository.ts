import { sql, desc, eq } from 'drizzle-orm';
import { db } from '../../database/client';
import { siteVisit, appUser } from '../../database/schema';
import { AdminAnalyticsStats } from './analytics.types';

export class AnalyticsRepository {
  async recordVisit(data: {
    path: string;
    visitorId: string;
    userId?: string | null;
    ipHash?: string | null;
    userAgent?: string | null;
    referer?: string | null;
    deviceType?: string;
  }) {
    const [inserted] = await db
      .insert(siteVisit)
      .values({
        path: data.path.slice(0, 500),
        visitorId: data.visitorId.slice(0, 100),
        userId: data.userId || null,
        ipHash: data.ipHash ? data.ipHash.slice(0, 64) : null,
        userAgent: data.userAgent || null,
        referer: data.referer ? data.referer.slice(0, 500) : null,
        deviceType: data.deviceType || 'DESKTOP',
      })
      .returning();

    // Se o usuário estiver autenticado, atualizamos lastLoginAt de forma leve (se mais de 30 minutos desde último registro)
    if (data.userId) {
      await db
        .update(appUser)
        .set({ lastLoginAt: new Date() })
        .where(
          sql`${appUser.id} = ${data.userId} AND (${appUser.lastLoginAt} IS NULL OR ${appUser.lastLoginAt} < NOW() - INTERVAL '30 minutes')`
        );
    }

    return inserted;
  }

  async getAdminStats(): Promise<AdminAnalyticsStats> {
    // 1. Visitas e Visitantes Únicos (Hoje, Ontem, 7d, 30d)
    const [countsRes] = await db.select({
      todayVisits: sql<number>`count(case when ${siteVisit.createdAt} >= CURRENT_DATE then 1 end)::int`,
      yesterdayVisits: sql<number>`count(case when ${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '1 day' and ${siteVisit.createdAt} < CURRENT_DATE then 1 end)::int`,
      sevenDaysVisits: sql<number>`count(case when ${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '7 days' then 1 end)::int`,
      thirtyDaysVisits: sql<number>`count(case when ${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '30 days' then 1 end)::int`,
      uniqueToday: sql<number>`count(distinct case when ${siteVisit.createdAt} >= CURRENT_DATE then ${siteVisit.visitorId} end)::int`,
      unique7Days: sql<number>`count(distinct case when ${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '7 days' then ${siteVisit.visitorId} end)::int`,
      unique30Days: sql<number>`count(distinct case when ${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '30 days' then ${siteVisit.visitorId} end)::int`,
    }).from(siteVisit);

    // 2. Usuários cadastrados ativos (Hoje e 7 dias)
    const [usersActiveRes] = await db.select({
      activeToday: sql<number>`count(case when ${appUser.lastLoginAt} >= CURRENT_DATE then 1 end)::int`,
      active7Days: sql<number>`count(case when ${appUser.lastLoginAt} >= CURRENT_DATE - INTERVAL '7 days' then 1 end)::int`,
    }).from(appUser);

    // 3. Top Páginas mais acessadas (Últimos 30 dias)
    const topPagesRows = await db
      .select({
        path: siteVisit.path,
        visits: sql<number>`count(*)::int`,
        uniqueVisitors: sql<number>`count(distinct ${siteVisit.visitorId})::int`,
      })
      .from(siteVisit)
      .where(sql`${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '30 days'`)
      .groupBy(siteVisit.path)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // 4. Tendência diária dos últimos 14 dias
    const dailyTrendRows = await db
      .select({
        date: sql<string>`to_char(${siteVisit.createdAt}, 'YYYY-MM-DD')`,
        visits: sql<number>`count(*)::int`,
        uniqueVisitors: sql<number>`count(distinct ${siteVisit.visitorId})::int`,
      })
      .from(siteVisit)
      .where(sql`${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '13 days'`)
      .groupBy(sql`to_char(${siteVisit.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${siteVisit.createdAt}, 'YYYY-MM-DD') asc`);

    // 5. Divisão por dispositivo
    const deviceRows = await db
      .select({
        device: siteVisit.deviceType,
        count: sql<number>`count(*)::int`,
      })
      .from(siteVisit)
      .where(sql`${siteVisit.createdAt} >= CURRENT_DATE - INTERVAL '30 days'`)
      .groupBy(siteVisit.deviceType);

    const totalDeviceCount = deviceRows.reduce((acc, row) => acc + row.count, 0) || 1;
    const deviceBreakdown = deviceRows.map((row) => ({
      device: row.device,
      count: row.count,
      percentage: Math.round((row.count / totalDeviceCount) * 100),
    }));

    // 6. Últimos acessos em tempo real (últimos 20 registros)
    const recentRows = await db
      .select({
        id: siteVisit.id,
        path: siteVisit.path,
        deviceType: siteVisit.deviceType,
        createdAt: siteVisit.createdAt,
        userId: siteVisit.userId,
        userName: appUser.name,
        userEmail: appUser.email,
        userAvatar: appUser.avatarUrl,
      })
      .from(siteVisit)
      .leftJoin(appUser, eq(siteVisit.userId, appUser.id))
      .orderBy(desc(siteVisit.createdAt))
      .limit(20);

    const recentVisits = recentRows.map((r) => ({
      id: r.id,
      path: r.path,
      deviceType: r.deviceType,
      createdAt: r.createdAt.toISOString(),
      isAnonymous: !r.userId,
      user: r.userId
        ? {
            id: r.userId,
            name: r.userName || 'Membro',
            email: r.userEmail || '',
            avatarUrl: r.userAvatar || null,
          }
        : null,
    }));

    return {
      todayVisits: countsRes?.todayVisits || 0,
      yesterdayVisits: countsRes?.yesterdayVisits || 0,
      sevenDaysVisits: countsRes?.sevenDaysVisits || 0,
      thirtyDaysVisits: countsRes?.thirtyDaysVisits || 0,
      uniqueVisitorsToday: countsRes?.uniqueToday || 0,
      uniqueVisitors7Days: countsRes?.unique7Days || 0,
      uniqueVisitors30Days: countsRes?.unique30Days || 0,
      registeredActiveToday: usersActiveRes?.activeToday || 0,
      registeredActive7Days: usersActiveRes?.active7Days || 0,
      topPages: topPagesRows,
      dailyTrend: dailyTrendRows,
      deviceBreakdown,
      recentVisits,
    };
  }
}
