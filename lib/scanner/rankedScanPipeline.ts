/**
 * Unified scan payload + legacy result shaping for `/api/scan`.
 * Strain slug resolution for hybrid fusion + catalog display names.
 */

import type { ScanAnalysisRaw } from "@/lib/scanner/scanTypes";
import { convertGptMatchesToCandidates } from "@/lib/scanner/scanFusion";

export { resolveStrainSlug } from "@/lib/scanner/strainSlug";

export interface UnifiedScanPayload {
  status: "ok" | "limited" | "error";
  resultType: "match" | "no_match" | "degraded";
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
  void imageCount;
  const raw = analysis as ScanAnalysisRaw;
  const imageSignals = raw.imageSignals;
  const usable = imageSignals?.usableVisualSignal !== false;

  const gptCandidates = convertGptMatchesToCandidates(raw.rankedMatches);
  const matches = gptCandidates.map((c) => ({
    strainName: c.strainName,
    confidence: Math.round(Math.max(0, Math.min(100, (c.score ?? 0) * 100))),
    reasons: c.reasons ?? [],
  }));

  const identity = raw.identity;
  const reasoning = raw.reasoning;

  const summary =
    typeof reasoning?.whyThisMatch === "string" && reasoning.whyThisMatch.trim()
      ? reasoning.whyThisMatch.trim()
      : typeof identity?.strainName === "string" && identity.strainName.trim()
        ? `Analysis suggests ${identity.strainName.trim()} as the leading match.`
        : "Visual analysis complete. Review matches and plant details below.";

  const plantAnalysis = raw.plantAnalysis ?? null;
  const growCoach = raw.growCoach ?? null;

  const improveTips: string[] = [];
  const gc = raw.growCoach;
  if (gc && typeof gc === "object") {
    const rec = gc as Record<string, unknown>;
    const pa = Array.isArray(rec.priorityActions) ? rec.priorityActions : [];
    const sug = Array.isArray(rec.suggestions) ? rec.suggestions : [];
    improveTips.push(
      ...pa.filter((x): x is string => typeof x === "string"),
      ...sug.filter((x): x is string => typeof x === "string")
    );
  }

  let poorImageMessage: string | undefined;
  let status: UnifiedScanPayload["status"] = "ok";
  let resultType: UnifiedScanPayload["resultType"] = "match";

  if (!usable) {
    status = "limited";
    resultType = "no_match";
    poorImageMessage =
      "Image quality or framing limits strain identification. Try brighter lighting, closer focus, or a clearer view of flower or labels.";
  } else if (matches.length === 0) {
    resultType = "no_match";
  }

  return {
    status,
    resultType,
    summary,
    matches,
    plantAnalysis,
    growCoach,
    improveTips,
    ...(poorImageMessage ? { poorImageMessage } : {}),
  };
}

export function buildLegacyResultBlob(
  legacyNormalized: Record<string, unknown>,
  fusedMatches: Array<{ strainName: string; confidence: number; reasons: string[] }>
): Record<string, unknown> {
  const out = { ...legacyNormalized };
  const prevIdentity =
    typeof out.identity === "object" && out.identity !== null
      ? (out.identity as Record<string, unknown>)
      : {};
  const identity = { ...prevIdentity };

  if (fusedMatches.length > 0) {
    identity.strainName = fusedMatches[0].strainName;
    identity.confidence = fusedMatches[0].confidence;
  }

  out.identity = identity;
  return out;
}
