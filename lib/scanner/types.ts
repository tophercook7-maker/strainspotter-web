/**
 * Canonical Scanner Result type.
 * This is the single source of truth for scanner outputs.
 * Expand only by adding OPTIONAL fields.
 */

export type ScannerResult = {
  confidence: number;

  closestCultivarMatch?: {
    name: string;
    confidence?: number;
  } | null;

  inferredGenetics?: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    parents?: string[];
    lineageFamilies?: string[];
  } | null;

  userFacingHighlights?: {
    aromaProfile?: string[];
    effects?: string[];
    bestFor?: string[];
    bestUseTime?: string;
  } | null;

  terpeneProfile?: {
    primary: string[];
    secondary?: string[];
    notes?: string;
  } | null;

  cannabinoidProfile?: {
    thc?: number;   // percentage
    cbd?: number;   // percentage
    cbg?: number;
    cbn?: number;
    notes?: string;
  } | null;
};
