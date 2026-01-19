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
    const safeAromas = Array.isArray(result.userFacingHighlights.aromaProfile) ? result.userFacingHighlights.aromaProfile : [];
    insights.push({
      title: "Aroma Profile",
      description: safeAromas.join(", "),
    });
  }

  if (result.userFacingHighlights?.effects?.length) {
    const safeEffects = Array.isArray(result.userFacingHighlights.effects) ? result.userFacingHighlights.effects : [];
    insights.push({
      title: "Effects",
      description: safeEffects.join(", "),
    });
  }

  if (result.userFacingHighlights?.bestFor?.length) {
    const safeBestFor = Array.isArray(result.userFacingHighlights.bestFor) ? result.userFacingHighlights.bestFor : [];
    insights.push({
      title: "Best For",
      description: safeBestFor.join(", "),
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
