/**
 * Canonical Scanner Result type.
 * This is the single source of truth for scanner outputs.
 * Expand only by adding OPTIONAL fields.
 */

export type ScannerResult = {
  strainName: string;
  confidence: number;

  lineage: {
    parents: string[];
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
  };

  aromas: string[];
  effects: string[];
  bestTime: string;

  closestCultivarMatch?: {
    name: string;
    confidence: number;
    source?: string;
  } | null;

  inferredGenetics?: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    parents?: string[];
    lineageFamilies?: string[];
    confidence?: number;
  } | null;

  // Reserved for future premium layers
  genetics?: {
    thc?: number;
    cbd?: number;
    terpenes?: string[];
  } | null;

  labData?: {
    labName?: string;
    testedAt?: string;
  } | null;

  notes?: string;
};
