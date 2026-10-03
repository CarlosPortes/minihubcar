import { apiClient } from './client';

export interface SupporterItem {
  id: string;
  donorName: string;
  amount: string;
  message: string | null;
  createdAt: string;
}

export interface CampaignStatusResponse {
  monthRef: string;
  cycleLabel?: string;
  goal: number;
  collected: number;
  remaining: number;
  progressPercentage: number;
  donationCount: number;
  daysRemaining: number;
  pixKey: string;
  pixKeyType: string;
  beneficiary: string;
  supporters: SupporterItem[];
}

export async function fetchDonationsCampaign(): Promise<CampaignStatusResponse> {
  return apiClient<CampaignStatusResponse>('/donations/campaign');
}

export async function notifyDonation(data: {
  donorName?: string;
  amount: number;
  message?: string;
}): Promise<{ message: string; donation: any }> {
  return apiClient('/donations/notify', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}
