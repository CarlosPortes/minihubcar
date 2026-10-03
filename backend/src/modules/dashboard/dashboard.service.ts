import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  constructor(private readonly dashboardRepository = new DashboardRepository()) {}

  async getDashboardSummary(userId: string) {
    const [metrics, distributions, recent] = await Promise.all([
      this.dashboardRepository.getMetrics(userId),
      this.dashboardRepository.getDistributions(userId),
      this.dashboardRepository.getRecentActivities(userId),
    ]);

    return {
      metrics,
      distributions,
      recent,
    };
  }
}
