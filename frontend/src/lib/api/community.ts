import { apiClient } from './client';

export interface CollectionPhoto {
  id: string;
  photoUrl: string;
  caption: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface PendingPhotoForAdmin {
  id: string;
  photoUrl: string;
  caption: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    city: string | null;
    state: string | null;
  };
}

export interface ShowcaseCollector {
  id: string;
  name: string;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  totalItems: number;
  approvedPhotos: Array<{
    id: string;
    photoUrl: string;
    caption: string | null;
  }>;
}

export const communityApi = {
  // Fotos do usuário logado (máximo 3)
  getMyPhotos: async (): Promise<{ data: CollectionPhoto[] }> => {
    return apiClient<{ data: CollectionPhoto[] }>('/users/profile/collection-photos');
  },

  addMyPhoto: async (data: { photoUrl: string; caption?: string }): Promise<{ data: CollectionPhoto }> => {
    return apiClient<{ data: CollectionPhoto }>('/users/profile/collection-photos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteMyPhoto: async (photoId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/users/profile/collection-photos/${photoId}`, {
      method: 'DELETE',
    });
  },

  // Moderação Admin
  getPendingPhotos: async (): Promise<{ data: PendingPhotoForAdmin[] }> => {
    return apiClient<{ data: PendingPhotoForAdmin[] }>('/admin/collection-photos/pending');
  },

  getModerationHistory: async (): Promise<{ data: any[] }> => {
    return apiClient<{ data: any[] }>('/admin/collection-photos/history');
  },

  moderatePhoto: async (photoId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
    return apiClient<{ data: any }>(`/admin/collection-photos/${photoId}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ action, rejectionReason }),
    });
  },

  // Vitrine pública da Comunidade
  getShowcase: async (search?: string, page = 1, limit = 24): Promise<{ data: ShowcaseCollector[]; meta: any }> => {
    return apiClient<{ data: ShowcaseCollector[]; meta: any }>('/community/showcase', {
      params: { search, page, limit },
    });
  },

  getCollectorProfile: async (userId: string) => {
    return apiClient<{ data: any }>(`/community/collectors/${userId}`);
  },

  // Mensagens Diretas / Chat
  listConversations: async (): Promise<{ data: DirectConversationItem[] }> => {
    return apiClient<{ data: DirectConversationItem[] }>('/community/conversations');
  },

  getMessages: async (conversationId: string): Promise<{ data: ConversationMessagesResult }> => {
    return apiClient<{ data: ConversationMessagesResult }>(`/community/conversations/${conversationId}/messages`);
  },

  sendMessage: async (recipientUserId: string, content: string): Promise<{ data: any }> => {
    return apiClient<{ data: any }>(`/community/messages/${recipientUserId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  getUnreadCount: async (): Promise<{ data: { unreadCount: number } }> => {
    return apiClient<{ data: { unreadCount: number } }>('/community/messages/unread-count');
  },
};

export interface DirectConversationItem {
  id: string;
  partner: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    city?: string | null;
    state?: string | null;
  };
  lastMessageText?: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

export interface DirectMessageItem {
  id: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationMessagesResult {
  conversationId: string;
  partner: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    city?: string | null;
    state?: string | null;
  };
  messages: DirectMessageItem[];
}

