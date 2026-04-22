/**
 * Unified scan payload + legacy result shaping for `/api/scan`.
 */

export { resolveStrainSlug } from "@/lib/scanner/strainSlug";

export interface UnifiedScanPayload {
  status: "ok" | "needs_better_images";
  resultType: "matched" | "unresolved";
  summary: string;
  matches: Array<{
    strainName: string;
    confidence: number;
    reasons: string[];
  }>;
  plantAnalysis: unknown;
  growCoach: unknown;
  improveTips: string[];
  poorImageMessage?: string;
}

export function buildUnifiedScanPayload(
  analysis: Record<string, unknown>,
  imageCount: number
): UnifiedScanPayload {
  const imageSignals =
    analysis.imageSignals && typeof analysis.imageSignals === "object"
      ? (analysis.imageSignals as Record<string, unknown>)
      : {};

  const plantAnalysis =
    analysis.plantAnalysis && typeof analysis.plantAnalysis === "object"
      ? analysis.plantAnalysis
      : null;

  const growCoach =
    analysis.growCoach && typeof analysis.growCoach === "object"
      ? analysis.growCoach
      : null;

  const rankedMatches = Array.isArray(analysis.rankedMatches)
    ? analysis.rankedMatches
    : [];

  const identity =
    analysis.identity && typeof analysis.identity === "object"
      ? (analysis.identity as Record<string, unknown>)
      : {};

  const matches = rankedMatches.slice(0, 3).map((match) => {
    const m = match as Record<string, unknown>;
    return {
      strainName:
        typeof m.strainName === "string" ? m.strainName : "Unknown Cultivar",
      confidence:
        typeof identity.confidence === "number" ? identity.confidence : 60,
      reasons: Array.isArray(m.reasons)
        ? m.reasons.filter((r): r is string => typeof r === "string")
        : [],
    };
  });

  const usableVisualSignal = imageSignals.usableVisualSignal !== false;

  return {
    status: usableVisualSignal ? "ok" : "needs_better_images",
    resultType: matches.length > 0 ? "matched" : "unresolved",
    summary:
      matches.length > 0
        ? `Top match: ${matches[0].strainName}`
        : imageCount > 1
          ? "No confident cultivar match found across uploaded images."
          : "No confident cultivar match found.",
    matches,
    plantAnalysis,
    growCoach,
    improveTips: usableVisualSignal
      ? [
          "Use multiple angles for better match confidence.",
          "Try brighter, sharper photos with the bud filling more of the frame.",
        ]
      : [
          "Use brighter lighting.",
          "Keep the bud in focus and centered.",
          "Try multiple angles or include packaging text if available.",
        ],
    poorImageMessage: usableVisualSignal
      ? undefined
      : "Image quality may be too poor for reliable analysis.",
  };
}

export function buildLegacyResultBlob(
  legacyNormalized: Record<string, unknown>,
  matches: Array<{ strainName: string; confidence: number; reasons: string[] }>
): Record<string, unknown> {
  const identity =
    legacyNormalized.identity && typeof legacyNormalized.identity === "object"
      ? (legacyNormalized.identity as Record<string, unknown>)
      : {};

  return {
    ...legacyNormalized,
    identity: {
      ...identity,
      strainName:
        matches[0]?.strainName ||
        (typeof identity.strainName === "string"
          ? identity.strainName
          : "Unknown Cultivar"),
      confidence:
        matches[0]?.confidence ||
        (typeof identity.confidence === "number" ? identity.confidence : 60),
      alternateMatches: matches.slice(1).map((m) => ({
        strainName: m.strainName,
        confidence: m.confidence,
      })),
    },
  };
}
