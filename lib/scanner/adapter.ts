import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";

export function adaptWikiToScannerView(
  wiki: WikiResult
): ScannerViewModel {
  // Normalize confidence: WikiResult has 0-100, ensure it's in that range
  const confidence = Math.max(0, Math.min(100, wiki.identity.confidence ?? 75));

  return {
    strainName: wiki.identity.strainName,
    confidencePct: confidence, // 0-100, normalized ONCE
    dominance: wiki.genetics?.dominance ?? "Unknown",
    genetics: wiki.genetics?.lineage ?? [],
    aromas: [], // Not in current WikiResult structure - placeholder
    effects: wiki.experience?.effects ?? [],
    bestFor: wiki.experience?.bestUse ?? [],
    summary: "This cultivar shows characteristics consistent with its genetic lineage.",
  };
}
