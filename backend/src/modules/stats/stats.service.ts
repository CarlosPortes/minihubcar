import { StatsRepository } from './stats.repository';

export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async getCommunityStats() {
    const [topWishlist, topCollected, topCollectors, topBrands, overview] = await Promise.all([
      this.statsRepository.getTopWishlist(10),
      this.statsRepository.getTopCollected(10),
      this.statsRepository.getTopCollectors(10),
      this.statsRepository.getTopBrands(6),
      this.statsRepository.getOverview(),
    ]);

    return {
      overview,
      topWishlist,
      topCollected,
      topCollectors,
      topBrands,
    };
  }
}
