// lib/scanner/mockResult.ts
import type { ScannerResult } from "./types";

export const MOCK_SCANNER_RESULT: ScannerResult = {
  strainName: "Northern Lights",
  confidence: 81,

  genetics: {
    dominance: "Indica",
    lineage: ["Afghani", "Thai"],
  },

  experience: {
    effects: ["Relaxing", "Body-heavy"],
    bestFor: ["Stress relief", "Evening use"],
    bestTime: "Night",
  },

  disclaimer:
    "Results are AI-assisted estimates and should not be considered definitive identification.",
};
