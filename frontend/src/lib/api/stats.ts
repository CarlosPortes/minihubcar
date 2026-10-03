import { apiClient } from './client';

export interface MiniatureStatItem {
  variationId: string;
  variationName: string;
  photoUrl: string | null;
  releaseYear: number | null;
  castingName: string;
  brandName: string | null;
  automakerName: string | null;
  count: number;
}

export interface CollectorStatItem {
  userId: string;
  name: string;
  avatarUrl: string | null;
  count: number;
  joinedAt: string;
}

export interface BrandStatItem {
  brandName: string;
  count: number;
}

export interface CommunityStatsResponse {
  overview: {
    totalCollectors: number;
    totalMiniaturesInCollections: number;
    totalCatalogModels: number;
    totalWishlistWishes: number;
  };
  topWishlist: MiniatureStatItem[];
  topCollected: MiniatureStatItem[];
  topCollectors: CollectorStatItem[];
  topBrands: BrandStatItem[];
}

export async function fetchCommunityStats(): Promise<CommunityStatsResponse> {
  return apiClient<CommunityStatsResponse>('/stats/community');
}
