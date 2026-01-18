// lib/scanner/wikiAdapter.ts
// 🔒 A.2 — Wiki → ViewModel adapter (NORMALIZATION HAPPENS HERE)

import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";

export function wikiToScannerViewModel(wiki: WikiResult): ScannerViewModel {
  const rawConfidence = wiki.identity?.confidence ?? 0;

  return {
    strainName: wiki.identity?.strainName ?? "Unknown",
    confidencePct:
      rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence),

    dominance: wiki.genetics?.dominance ?? "Unknown",
    genetics: wiki.genetics?.lineage ?? [], // Using 'lineage' from current WikiResult

    aromas: [], // Not in current WikiResult structure - will be populated when added
    effects: wiki.experience?.effects ?? [],
    bestFor: wiki.experience?.bestUse ?? [], // Using 'bestUse' from current WikiResult

    summary:
      "This cultivar shows characteristics consistent with its genetic lineage.",
  };
}
