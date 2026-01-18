// lib/scanner/viewModel.ts
// 🔒 A.2 — LOCK ScannerViewModel
// Single source of truth for UI-facing scan data

import type { WikiResult } from "./types";
import type { InsightResult } from "./insightEngine";

export interface ScannerViewModel {
  title: string;
  confidence: number; // 0–100
  insights: InsightResult;
  wiki: WikiResult;
}
