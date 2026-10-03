import { apiClient } from './client';

export interface SubscriptionPlan {
  id: string;
  code: 'FREE' | 'PRO' | 'MASTER' | 'LEGEND';
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxMiniatures: number;
  maxOtherCollectibles: number;
  features: string[];
  badge: string;
  isPopular: boolean;
  sortOrder: number;
}

export interface UserSubscriptionInfo {
  id: string;
  userId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod: string;
  startedAt: string;
  expiresAt?: string | null;
  plan: SubscriptionPlan;
}

export interface UserLimits {
  plan: {
    code: string;
    name: string;
    badge: string;
    monthlyPrice: string;
    yearlyPrice: string;
  };
  subscription: {
    status: string;
    billingCycle: string;
    expiresAt?: string | null;
  };
  miniatures: {
    current: number;
    max: number;
    canAdd: boolean;
    percentage: number;
    remaining: number | null;
  };
  otherCollectibles: {
    current: number;
    max: number;
    canAdd: boolean;
    percentage: number;
    remaining: number | null;
  };
}

export interface AdminSubscriptionStats {
  mrr: number;
  arr: number;
  totalUsers: number;
  activePaidSubscribers: number;
  expiredSubscribers: number;
  expiringSoonCount: number;
  countsByPlan: Record<string, number>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    monthlyPrice: string;
    yearlyPrice: string;
    subscribersCount: number;
  }>;
}

export interface AdminSubscriptionItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    status: string;
    whatsapp?: string | null;
  };
  plan: {
    id?: string;
    code: 'FREE' | 'PRO' | 'MASTER' | 'LEGEND';
    name: string;
    monthlyPrice: string;
    yearlyPrice: string;
    maxMiniatures: number;
    maxOtherCollectibles: number;
  };
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  paymentMethod: string;
  startedAt: string;
  expiresAt?: string | null;
  autoRenew: boolean;
  usage: {
    miniaturesCount: number;
    collectiblesCount: number;
  };
}

export interface AdminListSubscriptionsParams {
  page?: number;
  limit?: number;
  search?: string;
  planCode?: 'ALL' | 'FREE' | 'PRO' | 'MASTER' | 'LEGEND';
  status?: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  billingCycle?: 'ALL' | 'MONTHLY' | 'YEARLY';
}

export interface AdminUpdateSubscriptionInput {
  planCode?: 'FREE' | 'PRO' | 'MASTER' | 'LEGEND';
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  billingCycle?: 'MONTHLY' | 'YEARLY';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'FREE' | 'MANUAL';
  extendDays?: number;
  expiresAt?: string | null;
  notes?: string;
}

export const subscriptionsApi = {
  listPlans: async (): Promise<{ data: SubscriptionPlan[] }> => {
    return apiClient<{ data: SubscriptionPlan[] }>('/subscriptions/plans');
  },

  getMySubscription: async (): Promise<{ data: UserSubscriptionInfo }> => {
    return apiClient<{ data: UserSubscriptionInfo }>('/subscriptions/me');
  },

  getMyLimits: async (): Promise<{ data: UserLimits }> => {
    return apiClient<{ data: UserLimits }>('/subscriptions/limits');
  },

  subscribe: async (data: {
    planCode: 'FREE' | 'PRO' | 'MASTER' | 'LEGEND';
    billingCycle: 'MONTHLY' | 'YEARLY';
    paymentMethod: 'PIX' | 'CREDIT_CARD' | 'FREE';
  }): Promise<{ data: any }> => {
    return apiClient<{ data: any }>('/subscriptions/subscribe', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Admin APIs
  adminGetStats: async (): Promise<{ data: AdminSubscriptionStats }> => {
    return apiClient<{ data: AdminSubscriptionStats }>('/admin/subscriptions/stats');
  },

  adminListSubscriptions: async (
    params?: AdminListSubscriptionsParams
  ): Promise<{
    data: AdminSubscriptionItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    return apiClient('/admin/subscriptions', { params: params as any });
  },

  adminUpdateSubscription: async (
    userId: string,
    input: AdminUpdateSubscriptionInput
  ): Promise<{ data: any }> => {
    return apiClient<{ data: any }>(`/admin/subscriptions/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
