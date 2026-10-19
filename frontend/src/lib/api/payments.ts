import { apiClient } from './client';

export interface PixChargeResponse {
  chargeId: string;
  txid: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  pixCopiaECola: string;
  qrCodeUrl: string;
  expiresAt: string;
  description?: string;
  paidAt?: string;
}

export interface CreatePixChargeInput {
  referenceType: 'SUBSCRIPTION' | 'PRE_ORDER_INSTALLMENT' | 'DONATION' | 'ORDER';
  referenceId?: string;
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
}

export const paymentsApi = {
  createPixCharge: async (input: CreatePixChargeInput): Promise<PixChargeResponse> => {
    const res = await apiClient<{ success: boolean; data: PixChargeResponse }>('/payments/pix', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  getPixCharge: async (chargeId: string): Promise<PixChargeResponse> => {
    const res = await apiClient<{ success: boolean; data: PixChargeResponse }>(`/payments/pix/${chargeId}`);
    return res.data;
  },

  verifyPixPayment: async (chargeId: string): Promise<{ status: string; message: string }> => {
    const res = await apiClient<{ success: boolean; data: { status: string; message: string } }>(
      `/payments/pix/${chargeId}/verify`,
      { method: 'POST' }
    );
    return res.data;
  },
};
