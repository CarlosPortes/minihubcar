import { DonationsRepository } from './donations.repository';
import { env } from '../../config/env';

export class DonationsService {
  constructor(private readonly donationsRepository: DonationsRepository) {}

  private getCycleDates(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let cycleStart: Date;
    let cycleEnd: Date;

    if (day >= 20) {
      cycleStart = new Date(year, month, 20, 0, 0, 0, 0);
      cycleEnd = new Date(year, month + 1, 20, 0, 0, 0, 0);
    } else {
      cycleStart = new Date(year, month - 1, 20, 0, 0, 0, 0);
      cycleEnd = new Date(year, month, 20, 0, 0, 0, 0);
    }

    const startStr = `${String(cycleStart.getDate()).padStart(2, '0')}/${String(cycleStart.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(cycleEnd.getDate()).padStart(2, '0')}/${String(cycleEnd.getMonth() + 1).padStart(2, '0')}`;
    const cycleLabel = `${startStr} a ${endStr}`;
    const monthRef = `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, '0')}-ciclo20`;

    const diffMs = cycleEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return { cycleStart, cycleEnd, cycleLabel, monthRef, daysRemaining };
  }

  async getCampaignStatus() {
    const { cycleStart, cycleEnd, cycleLabel, monthRef, daysRemaining } = this.getCycleDates();
    const goal = env.DONATION_MONTHLY_GOAL;
    const pixKey = env.DONATION_PIX_KEY;
    const beneficiary = 'MiniHub Car - Manutenção do Servidor';

    const { collected, donationCount, supporters } = await this.donationsRepository.getCycleSummary(
      cycleStart,
      cycleEnd
    );

    const progressPercentage = Math.min(100, Math.round((collected / goal) * 100));
    const remaining = Math.max(0, parseFloat((goal - collected).toFixed(2)));

    return {
      monthRef,
      cycleLabel,
      cycleStartDate: cycleStart.toISOString(),
      cycleEndDate: cycleEnd.toISOString(),
      goal,
      collected,
      remaining,
      progressPercentage,
      donationCount,
      daysRemaining,
      pixKey,
      pixKeyType: 'ALEATORIA',
      beneficiary,
      supporters,
    };
  }

  async registerDonation(data: {
    userId?: string;
    donorName?: string;
    amount: number;
    message?: string;
  }) {
    if (!data.amount || data.amount <= 0) {
      throw new Error('O valor da contribuição deve ser maior que zero.');
    }

    const { monthRef } = this.getCycleDates();
    const pixKey = env.DONATION_PIX_KEY;

    return this.donationsRepository.createDonation({
      userId: data.userId,
      donorName: (data.donorName || 'Colecionador Apoiador').trim().substring(0, 150),
      amount: data.amount,
      pixKey,
      message: data.message?.trim().substring(0, 500),
      monthRef,
    });
  }
}
