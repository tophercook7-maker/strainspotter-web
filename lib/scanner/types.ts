// lib/scanner/types.ts

export type Dominance =
  | "Indica"
  | "Sativa"
  | "Hybrid"
  | "Unknown";

export interface ClosestCultivarMatch {
  name: string;
  similarity: number; // 0–100
}

export interface InferredGenetics {
  dominance: Dominance;
  parents?: string[];
  confidence?: number; // 0–100
}

export interface UserFacingHighlights {
  aromaProfile?: string[];
  effects?: string[];
  bestFor?: string[];
  bestTime?: string;
}

export interface ScienceLayer {
  terpenes?: {
    name: string;
    percentage?: number;
  }[];
  cannabinoids?: {
    name: string;
    percentage?: number;
  }[];
}

export interface ScannerResult {
  strainName: string;
  confidence: number; // overall confidence 0–100

  closestCultivarMatch?: ClosestCultivarMatch;

  inferredGenetics: InferredGenetics;

  userFacingHighlights?: UserFacingHighlights;

  scienceLayer?: ScienceLayer;
}
