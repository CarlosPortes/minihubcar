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
  confidenceScore: number; // 0 to 100
  matchedReasons: string[];
}

export interface IdentifyMiniatureResponse {
  analysis: MiniatureAiAnalysis;
  matches: MiniatureMatchResult[];
  engineUsed: 'gemini-vision' | 'heuristic-smart-match';
}
