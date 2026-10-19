import { apiClient } from './client';

export interface DoubleMatchItem {
  other_user_id: string;
  other_user_name: string;
  other_user_username: string | null;
  other_user_avatar_url: string | null;
  other_user_city: string | null;
  other_user_state: string | null;
  other_user_whatsapp: string | null;

  my_offered_exemplar_id: string;
  my_offered_variation_id: string;
  my_offered_variation_name: string;
  my_offered_photo_url: string | null;
  my_offered_brand_name: string;

  other_offered_exemplar_id: string;
  other_offered_variation_id: string;
  other_offered_variation_name: string;
  other_offered_photo_url: string | null;
  other_offered_brand_name: string;
}

export interface TheyWantItem {
  other_user_id: string;
  other_user_name: string;
  other_user_username: string | null;
  other_user_avatar_url: string | null;
  other_user_city: string | null;
  other_user_state: string | null;
  other_user_whatsapp: string | null;

  my_exemplar_id: string;
  variation_id: string;
  variation_name: string;
  photo_url: string | null;
  brand_name: string;
  wishlist_priority: number;
}

export interface TheyHaveItem {
  other_user_id: string;
  other_user_name: string;
  other_user_username: string | null;
  other_user_avatar_url: string | null;
  other_user_city: string | null;
  other_user_state: string | null;
  other_user_whatsapp: string | null;

  other_exemplar_id: string;
  variation_id: string;
  variation_name: string;
  photo_url: string | null;
  brand_name: string;
  my_priority: number;
}

export interface MatchesResponse {
  doubleMatches: DoubleMatchItem[];
  theyWant: TheyWantItem[];
  theyHave: TheyHaveItem[];
  summary: {
    doubleMatchesCount: number;
    theyWantCount: number;
    theyHaveCount: number;
  };
}

export interface MyTradeExemplar {
  exemplarId: string;
  variationId: string;
  name: string;
  releaseYear: number | null;
  brandName: string;
  photoUrl: string | null;
  isForTrade: boolean;
  notes: string | null;
  createdAt: string;
}

export interface TradeProposalItem {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  message: string | null;
  created_at: string;
  updated_at: string;

  requester_id?: string;
  requester_name?: string;
  requester_username?: string | null;
  requester_avatar_url?: string | null;
  requester_whatsapp?: string | null;
  requester_city?: string | null;
  requester_state?: string | null;

  receiver_id?: string;
  receiver_name?: string;
  receiver_username?: string | null;
  receiver_avatar_url?: string | null;
  receiver_whatsapp?: string | null;
  receiver_city?: string | null;
  receiver_state?: string | null;

  offered_variation_id: string;
  offered_variation_name: string;
  offered_photo_url: string | null;
  offered_brand_name: string;

  requested_variation_id?: string | null;
  requested_variation_name?: string | null;
  requested_photo_url?: string | null;
  requested_brand_name?: string | null;
}

export const tradesApi = {
  getMatches: async (): Promise<MatchesResponse> => {
    const res = await apiClient<{ success: boolean; data: MatchesResponse }>('/trades/matches');
    return res.data;
  },

  getMyTradeExemplars: async (): Promise<MyTradeExemplar[]> => {
    const res = await apiClient<{ success: boolean; data: MyTradeExemplar[] }>('/trades/my-exemplars');
    return res.data;
  },

  toggleTrade: async (exemplarId: string, isForTrade: boolean): Promise<any> => {
    const res = await apiClient<{ success: boolean; data: any }>('/trades/toggle', {
      method: 'POST',
      body: JSON.stringify({ exemplarId, isForTrade }),
    });
    return res.data;
  },

  createProposal: async (input: {
    receiverId: string;
    offeredExemplarId: string;
    requestedExemplarId?: string;
    message?: string;
  }): Promise<any> => {
    const res = await apiClient<{ success: boolean; data: any }>('/trades/proposals', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  listProposals: async (): Promise<{ incoming: TradeProposalItem[]; outgoing: TradeProposalItem[] }> => {
    const res = await apiClient<{
      success: boolean;
      data: { incoming: TradeProposalItem[]; outgoing: TradeProposalItem[] };
    }>('/trades/proposals');
    return res.data;
  },

  updateProposalStatus: async (
    proposalId: string,
    status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  ): Promise<any> => {
    const res = await apiClient<{ success: boolean; data: any }>(`/trades/proposals/${proposalId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },
};
