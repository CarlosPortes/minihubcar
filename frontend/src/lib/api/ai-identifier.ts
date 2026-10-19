import { apiClient } from './client';

export interface MiniatureAiAnalysis {
  manufacturer: string;
  modelName: string;
  series?: string | null;
  year?: number | null;
  primaryColor?: string | null;
  cardNumber?: string | null;
  toyNumber?: string | null;
  confidence: number;
  observations?: string | null;
}

export interface MiniatureMatchResult {
  variationId: string;
  castingId: string;
  castingName: string;
  brandName: string | null;
  automakerName: string | null;
  seriesName: string | null;
  scaleName: string | null;
  releaseYear: number | null;
  color: string | null;
  photoUrl: string | null;
  confidenceScore: number;
  matchedReasons: string[];
}

export interface IdentifyMiniatureResponse {
  analysis: MiniatureAiAnalysis;
  matches: MiniatureMatchResult[];
  engineUsed: 'gemini-vision' | 'heuristic-smart-match';
}

export interface AiStatusResponse {
  status: string;
  geminiVisionEnabled: boolean;
  model: string;
  provider: string;
}

export const aiIdentifierApi = {
  identifyMiniature: async (payload: {
    imageBase64: string;
    mimeType?: string;
    textHint?: string;
  }): Promise<IdentifyMiniatureResponse> => {
    const res = await apiClient<{ success: boolean; data: IdentifyMiniatureResponse }>(
      '/ai/identify-miniature',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  getAiStatus: async (): Promise<AiStatusResponse> => {
    const res = await apiClient<{ success: boolean; data: AiStatusResponse }>('/ai/status');
    return res.data;
  },
};
