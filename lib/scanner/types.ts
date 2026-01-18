/**
 * Canonical Scanner Result type.
 * This is the single source of truth for scanner outputs.
 * Expand only by adding OPTIONAL fields.
 */

export interface ScannerResult {
  strainName: string;
  confidence: number;

  closestCultivarMatch: {
    name: string;
    confidence: number;
  };

  inferredGenetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    parents?: string[];
    lineageFamilies?: string[];
  };

  userFacingHighlights: {
    aromaProfile?: string[];
    effects?: string[];
    bestFor?: string[];
    bestUseTime?: string;
  };

  terpeneProfile?: {
    name: string;
    intensity: number;
    description?: string;
  }[];

  cannabinoidProfile?: {
    name: string;
    percentage?: number;
    effect?: string;
  }[];
}
