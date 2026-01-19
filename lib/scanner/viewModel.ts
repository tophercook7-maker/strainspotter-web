// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

export interface ScannerViewModel {
  name: string;
  title: string; // Keep for backward compat
  confidence: number; // 0–100
  whyThisMatch: string;
  morphology: string;
  trichomes: string;
  pistils: string;
  structure: string;
  growthTraits: string[];
  terpeneGuess: string[];
  effectsShort: string[];
  effectsLong: string[];
  comparisons?: string[];
  uncertaintyExplanation: string;
  referenceStrains: string[];
  sources?: string[];
  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    lineage: string;
  };
  experience: {
    effects: string[];
    bestFor: string[];
    bestTime?: string;
    summary?: string;
  };
  disclaimer: string;
}
