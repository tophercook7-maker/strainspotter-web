// lib/scanner/wikiAdapter.ts
// 🔒 A.7 — Wiki → ViewModel adapter (LOCK VARIATION)

import type { WikiResult } from "./types";
import type { ScannerViewModel } from "./viewModel";

export function wikiToViewModel(wiki: WikiResult): ScannerViewModel {
  const safeLineage = Array.isArray(wiki.genetics.lineage) ? wiki.genetics.lineage : [];
  
  return {
    title: wiki.identity.strainName,
    confidence: Math.min(95, wiki.identity.confidence),
    genetics: {
      dominance: wiki.genetics.dominance,
      lineage: safeLineage.join(" × "),
    },
    experience: {
      effects: wiki.experience.effects.slice(0, 3),
      bestFor: wiki.experience.bestUse.slice(0, 2),
      bestTime: wiki.experience.duration,
      summary: `Based on observed visual characteristics and growth patterns, this plant shows traits commonly associated with ${wiki.experience.effects[0]?.toLowerCase() || "calming"} effects. The morphology suggests a profile that may provide ${wiki.experience.effects.slice(0, 2).join(" and ").toLowerCase() || "balanced"} experiences.`,
    },
    disclaimer:
      "Results are AI-assisted estimates and not definitive identification.",
  };
}
