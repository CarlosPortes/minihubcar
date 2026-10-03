import { apiClient } from './client';

export type FeedbackType =
  | 'FEATURE_REQUEST'
  | 'USABILITY'
  | 'COMMUNITY_IDEA'
  | 'BUG_REPORT'
  | 'OTHER';

export interface FeedbackSuggestion {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: 'PENDING' | 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'DECLINED';
  adminResponse?: string | null;
  respondedAt?: string | null;
  upvotesCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export const feedbackApi = {
  list: async (type?: string, status?: string): Promise<{ data: FeedbackSuggestion[] }> => {
    return apiClient<{ data: FeedbackSuggestion[] }>('/feedback', {
      params: { type, status },
    });
  },

  create: async (data: {
    type: FeedbackType;
    title: string;
    description: string;
  }): Promise<{ data: FeedbackSuggestion }> => {
    return apiClient<{ data: FeedbackSuggestion }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  moderate: async (
    id: string,
    data: {
      status: 'PENDING' | 'PLANNED' | 'IN_PROGRESS' | 'IMPLEMENTED' | 'DECLINED';
      adminResponse?: string;
    }
  ): Promise<{ data: FeedbackSuggestion }> => {
    return apiClient<{ data: FeedbackSuggestion }>(`/feedback/${id}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
