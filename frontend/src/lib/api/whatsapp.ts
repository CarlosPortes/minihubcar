import { apiClient } from './client';

export interface WhatsAppStatusResponse {
  connected: boolean;
  state: string; // 'open' | 'close' | 'connecting' | 'not_created'
  instanceName: string;
  adminPhone: string | null;
}

export interface WhatsAppQRCodeResponse {
  qrcode: string | null;
  base64: string | null;
  state: string;
  count?: number;
}

export const whatsappApi = {
  getStatus: async (): Promise<WhatsAppStatusResponse> => {
    const res = await apiClient<{ success: boolean; data: WhatsAppStatusResponse }>('/admin/whatsapp/status', {
      method: 'GET',
    });
    return res.data;
  },

  getQRCode: async (): Promise<WhatsAppQRCodeResponse> => {
    const res = await apiClient<{ success: boolean; data: WhatsAppQRCodeResponse }>('/admin/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return res.data;
  },

  disconnect: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>('/admin/whatsapp/disconnect', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  sendTest: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>('/admin/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
