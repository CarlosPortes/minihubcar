import { apiClient } from './client';

export type ExternalPreOrderStatus =
  | 'RESERVED'
  | 'ARRIVED_AT_SELLER'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface ExternalPreOrderPaymentItem {
  id: string;
  preOrderId: string;
  amount: string;
  paidAt: string;
  description: string;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

export interface ExternalPreOrderItem {
  id: string;
  userId: string;
  variationId: string | null;
  customMiniatureName: string | null;
  customBrand: string | null;
  customScale: string;
  customPhotoUrl: string | null;
  sellerName: string;
  sellerContact: string | null;
  quantity: number;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  orderDate: string;
  estimatedArrival: string | null;
  status: ExternalPreOrderStatus;
  trackingCode: string | null;
  trackingCarrier: string | null;
  convertedExemplarId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  catalogName?: string | null;
  catalogPhotoUrl?: string | null;
  catalogReleaseYear?: number | null;
  castingName?: string | null;
  brandName?: string | null;
  scaleName?: string | null;
  displayName: string;
  displayPhoto: string | null;
  displayBrand: string;
  displayScale: string;
  payments: ExternalPreOrderPaymentItem[];
}

export interface ExternalPreOrdersSummary {
  totalContracted: number;
  totalPaid: number;
  totalRemaining: number;
  totalItems: number;
  activeCount: number;
  receivedCount: number;
  totalCount: number;
}

export interface CreateExternalPreOrderInput {
  variationId?: string | null;
  customMiniatureName?: string | null;
  customBrand?: string | null;
  customScale?: string;
  customPhotoUrl?: string | null;
  sellerName: string;
  sellerContact?: string | null;
  quantity?: number;
  totalAmount: number;
  paidAmount?: number;
  orderDate?: string;
  estimatedArrival?: string | null;
  status?: ExternalPreOrderStatus;
  trackingCode?: string | null;
  trackingCarrier?: string | null;
  notes?: string | null;
}

export interface UpdateExternalPreOrderInput {
  sellerName?: string;
  sellerContact?: string | null;
  customMiniatureName?: string | null;
  customBrand?: string | null;
  customScale?: string;
  customPhotoUrl?: string | null;
  totalAmount?: number;
  status?: ExternalPreOrderStatus;
  estimatedArrival?: string | null;
  trackingCode?: string | null;
  trackingCarrier?: string | null;
  notes?: string | null;
}

export interface AddExternalPaymentInput {
  amount: number;
  paidAt?: string;
  description: string;
  paymentMethod?: string;
  notes?: string | null;
}

export interface ConvertToCollectionInput {
  conditionCode?: string;
  locationId?: string | null;
  gridRow?: number | null;
  gridColumn?: number | null;
  notes?: string | null;
}

export const externalPreOrdersApi = {
  list: async (status?: string): Promise<ExternalPreOrderItem[]> => {
    const res = await apiClient<{ data: ExternalPreOrderItem[] }>('/external-pre-orders', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  getSummary: async (): Promise<ExternalPreOrdersSummary> => {
    const res = await apiClient<{ data: ExternalPreOrdersSummary }>('/external-pre-orders/summary');
    return res.data;
  },

  getById: async (id: string): Promise<ExternalPreOrderItem> => {
    const res = await apiClient<{ data: ExternalPreOrderItem }>(`/external-pre-orders/${id}`);
    return res.data;
  },

  create: async (input: CreateExternalPreOrderInput): Promise<ExternalPreOrderItem> => {
    const res = await apiClient<{ data: ExternalPreOrderItem }>('/external-pre-orders', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  update: async (id: string, input: UpdateExternalPreOrderInput): Promise<ExternalPreOrderItem> => {
    const res = await apiClient<{ data: ExternalPreOrderItem }>(`/external-pre-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  addPayment: async (id: string, input: AddExternalPaymentInput): Promise<any> => {
    const res = await apiClient<{ data: any }>(`/external-pre-orders/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  convertToCollection: async (id: string, input: ConvertToCollectionInput): Promise<any> => {
    const res = await apiClient<{ data: any; message: string }>(`/external-pre-orders/${id}/convert-to-collection`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient(`/external-pre-orders/${id}`, {
      method: 'DELETE',
    });
  },
};
