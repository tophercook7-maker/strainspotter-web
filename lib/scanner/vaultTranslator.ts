// lib/scanner/vaultTranslator.ts

import { VaultSignals } from "./vaultSignals";
import { buildScannerResult } from "./resultBuilder";
import type { ScannerResult } from "./types";

export function translateVaultToScannerResult(
  signals: VaultSignals
): ScannerResult {
  return buildScannerResult({
    visualFingerprint: {
      morphology: signals.image.morphology,
      trichomes: signals.image.trichomeDensity,
      coloration: signals.image.coloration ?? [],
    },
    inferredGenetics: {
      dominance: inferDominance(signals),
      lineageFamilies: signals.metadata.suspectedFamilies ?? [],
      confidence: 70,
    },
    closestCultivarMatch: {
      name: signals.metadata.knownCultivarNames?.[0] ?? "Unknown Hybrid",
      confidence: 75,
    },
    userFacingHighlights: {
      effects: signals.metadata.reportedEffects ?? [],
      aromaProfile: signals.metadata.aromaHints ?? [],
      bestUseTime: inferBestUse(signals),
    },
    integrityFlags: {
      inferredOnly: true,
      labVerified: false,
      confidenceTier: "medium",
    },
  });
}

function inferDominance(signals: VaultSignals) {
  if (signals.metadata.reportedEffects?.includes("Relaxing")) return "indica";
  if (signals.metadata.reportedEffects?.includes("Energetic")) return "sativa";
  return "hybrid";
}

function inferBestUse(signals: VaultSignals) {
  if (signals.metadata.reportedEffects?.includes("Sleep")) return "Night";
  if (signals.metadata.reportedEffects?.includes("Focus")) return "Day";
  return "Evening";
}
