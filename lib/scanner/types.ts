// lib/scanner/types.ts

export type GeneticDominance = "Indica" | "Sativa" | "Hybrid" | "Unknown";

export interface ScannerResult {
  strainName: string;
  confidence: number; // 0–100

  genetics: {
    dominance: GeneticDominance;
    parents?: string[];
  };

  highlights: {
    aroma?: string[];
    effects?: string[];
    bestFor?: string[];
    bestTime?: string;
  };

  disclaimer: string;
}
