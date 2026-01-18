// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

export interface ScannerViewModel {
  title: string;
  confidence: number; // 0–100
  genetics: {
    dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
    lineage: string;
  };
  experience: {
    effects: string[];
    bestFor: string[];
    bestTime?: string;
  };
  disclaimer: string;
}
