// lib/scanner/insights.ts

import type { ScannerResult } from "./types";

export interface ScannerInsight {
  title: string;
  description: string;
  confidence?: number;
}

export function buildScannerInsights(
  result: ScannerResult
): ScannerInsight[] {
  const insights: ScannerInsight[] = [];

  insights.push({
    title: result.strainName,
    description: `Overall confidence: ${result.confidence}%`,
    confidence: result.confidence,
  });

  if (result.inferredGenetics?.dominance) {
    insights.push({
      title: "Genetic Dominance",
      description: result.inferredGenetics.dominance,
      confidence: result.inferredGenetics.confidence,
    });
  }

  if (result.userFacingHighlights?.aromaProfile?.length) {
    insights.push({
      title: "Aroma Profile",
      description: result.userFacingHighlights.aromaProfile.join(", "),
    });
  }

  if (result.userFacingHighlights?.effects?.length) {
    insights.push({
      title: "Effects",
      description: result.userFacingHighlights.effects.join(", "),
    });
  }

  if (result.userFacingHighlights?.bestFor?.length) {
    insights.push({
      title: "Best For",
      description: result.userFacingHighlights.bestFor.join(", "),
    });
  }

  if (result.userFacingHighlights?.bestTime) {
    insights.push({
      title: "Best Time",
      description: result.userFacingHighlights.bestTime,
    });
  }

  return insights;
}
