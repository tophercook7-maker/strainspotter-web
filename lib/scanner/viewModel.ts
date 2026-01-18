// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

export interface ScannerViewModel {
  strainName: string;
  confidencePct: number; // 0–100, normalized ONCE
  dominance: "Indica" | "Sativa" | "Hybrid" | "Unknown";
  genetics: string[];
  aromas: string[];
  effects: string[];
  bestFor: string[];
  summary: string;
}
