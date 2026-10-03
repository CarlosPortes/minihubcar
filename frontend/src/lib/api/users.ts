import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  status: string;
  isCollectionPublic?: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  isCollectionPublic?: boolean;
}

export interface UpdateEmailInput {
  newEmail: string;
  currentPassword: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUserSellerInfo {
  isSeller: boolean;
  sellerId: string | null;
  storeName: string | null;
  slug: string | null;
  isActive: boolean | null;
  authorizationStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isHomologated: boolean;
  authorizationNotes: string | null;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  isCollectionPublic: boolean;
  roles: string[];
  seller: AdminUserSellerInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sellerStatus?: string;
  role?: string;
}

export interface AdminListUsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  homologatedSellers: number;
}

export const usersApi = {
  getProfile: async (): Promise<{ data: UserProfile }> => {
    return apiClient<{ data: UserProfile }>('/users/me');
  },

  updateProfile: async (input: UpdateProfileInput): Promise<{ data: UserProfile }> => {
    return apiClient<{ data: UserProfile }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  updateEmail: async (input: UpdateEmailInput): Promise<{ data: { user: UserProfile; accessToken: string } }> => {
    return apiClient<{ data: { user: UserProfile; accessToken: string } }>('/users/me/email', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  updatePassword: async (input: UpdatePasswordInput): Promise<{ data: { message: string } }> => {
    return apiClient<{ data: { message: string } }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await apiClient<{ data: { url: string; publicUrl: string } }>('/media/upload', {
      method: 'POST',
      body: formData,
    });

    return { url: res.data.publicUrl || res.data.url };
  },

  // Admin Methods
  adminGetStats: async (): Promise<{ data: AdminUserStats }> => {
    return apiClient<{ data: AdminUserStats }>('/admin/users/stats');
  },

  adminListUsers: async (params?: AdminListUsersParams): Promise<{ data: AdminListUsersResponse }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.sellerStatus && params.sellerStatus !== 'ALL') query.append('sellerStatus', params.sellerStatus);
    if (params?.role && params.role !== 'ALL') query.append('role', params.role);

    const qs = query.toString();
    return apiClient<{ data: AdminListUsersResponse }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  adminUpdateStatus: async (
    userId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<{ data: { message: string; user: any } }> => {
    return apiClient<{ data: { message: string; user: any } }>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  adminResetPassword: async (
    userId: string,
    newPassword?: string
  ): Promise<{ data: { message: string; temporaryPassword: string; user: any } }> => {
    return apiClient<{ data: { message: string; temporaryPassword: string; user: any } }>(
      `/admin/users/${userId}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }
    );
  },

  adminUpdateRoles: async (
    userId: string,
    roles: string[]
  ): Promise<{ data: { message: string; roles: string[] } }> => {
    return apiClient<{ data: { message: string; roles: string[] } }>(`/admin/users/${userId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roles }),
    });
  },
};

