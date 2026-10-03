import { and, gte, lt, sql, desc } from 'drizzle-orm';
import { db } from '../../database/client';
import { donation } from '../../database/schema';

export class DonationsRepository {
  async getCycleSummary(cycleStart: Date, cycleEnd: Date) {
    const [totalResult] = await db
      .select({
        totalAmount: sql<string>`coalesce(sum(${donation.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(donation)
      .where(and(gte(donation.createdAt, cycleStart), lt(donation.createdAt, cycleEnd)));

    const supporters = await db
      .select({
        id: donation.id,
        donorName: donation.donorName,
        amount: donation.amount,
        message: donation.message,
        createdAt: donation.createdAt,
      })
      .from(donation)
      .where(and(gte(donation.createdAt, cycleStart), lt(donation.createdAt, cycleEnd)))
      .orderBy(desc(donation.createdAt))
      .limit(20);

    return {
      collected: parseFloat(totalResult?.totalAmount || '0'),
      donationCount: totalResult?.count || 0,
      supporters,
    };
  }

  async createDonation(data: {
    userId?: string;
    donorName: string;
    amount: number;
    pixKey?: string;
    message?: string;
    monthRef: string;
  }) {
    const [created] = await db
      .insert(donation)
      .values({
        userId: data.userId,
        donorName: data.donorName,
        amount: data.amount.toFixed(2),
        pixKey: data.pixKey,
        message: data.message,
        monthRef: data.monthRef,
      })
      .returning();

    return created;
  }
}
