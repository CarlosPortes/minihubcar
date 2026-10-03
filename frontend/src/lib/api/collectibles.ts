import { apiClient } from './client';

export type CollectibleCategory =
  | 'FUNKO_POP'
  | 'STATUE_RESIN'
  | 'BUST'
  | 'ACTION_FIGURE'
  | 'DIORAMA'
  | 'MEMORABILIA'
  | 'OTHER';

export interface CustomCollectible {
  id: string;
  name: string;
  category: CollectibleCategory;
  manufacturer?: string | null;
  franchise?: string | null;
  characterOrSubject?: string | null;
  releaseYear?: number | null;
  edition?: string | null;
  scale?: string | null;
  conditionCode: 'MINT' | 'IN_BOX' | 'LOOSE' | 'DAMAGED';
  purchasePrice?: string | null;
  purchaseLocation?: string | null;
  acquisitionDate?: string | null;
  gridRow?: number | null;
  gridColumn?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  location?: {
    id: string;
    name: string;
    hasGrid: boolean;
    gridRows?: number | null;
    gridColumns?: number | null;
  } | null;
}

export interface CollectiblesSummary {
  totalCount: number;
  totalInvested: number;
  byCategory: Array<{
    category: CollectibleCategory;
    count: number;
    totalInvested: number;
  }>;
}

export interface CreateCollectibleInput {
  name: string;
  category: CollectibleCategory;
  manufacturer?: string | null;
  franchise?: string | null;
  characterOrSubject?: string | null;
  releaseYear?: number | null;
  edition?: string | null;
  scale?: string | null;
  conditionCode?: 'MINT' | 'IN_BOX' | 'LOOSE' | 'DAMAGED';
  purchasePrice?: number | null;
  purchaseLocation?: string | null;
  acquisitionDate?: string | null;
  locationId?: string | null;
  gridRow?: number | null;
  gridColumn?: number | null;
  photoUrl?: string | null;
  notes?: string | null;
}

export const collectiblesApi = {
  list: async (params?: {
    category?: string;
    locationId?: string;
    franchise?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: CustomCollectible[]; pagination: any }> => {
    return apiClient<{ data: CustomCollectible[]; pagination: any }>('/collectibles', {
      params,
    });
  },

  getSummary: async (): Promise<{ data: CollectiblesSummary }> => {
    return apiClient<{ data: CollectiblesSummary }>('/collectibles/summary');
  },

  getById: async (id: string): Promise<{ data: CustomCollectible }> => {
    return apiClient<{ data: CustomCollectible }>(`/collectibles/${id}`);
  },

  create: async (data: CreateCollectibleInput): Promise<{ data: CustomCollectible }> => {
    return apiClient<{ data: CustomCollectible }>('/collectibles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<CreateCollectibleInput>): Promise<{ data: CustomCollectible }> => {
    return apiClient<{ data: CustomCollectible }>(`/collectibles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/collectibles/${id}`, {
      method: 'DELETE',
    });
  },
};
