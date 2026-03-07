import type { ScanResultPayloadV1 } from "@/lib/scanner/types";

/**
 * Produces a UI-safe object for WikiStyleResultPanel without requiring
 * the judge/orchestrator pipeline to change immediately.
 *
 * We return a "FullScanResult-like" object using only fields WikiStyleResultPanel
 * already expects: nameFirstDisplay, confidence, tier labels, alternates, traits buckets, etc.
 *
 * Keep this adapter small + deterministic.
 */
export function resultPayloadToFullScanResult(payload: ScanResultPayloadV1) {
  const primaryName = payload.primary_match?.strain_name ?? "Unverified Cultivar (visual match only)";
  const confidence01 = clamp01(payload.primary_match?.confidence ?? payload.confidence_summary?.overall ?? 0);
  const confidencePercent = Math.round(confidence01 * 100);

  const reliability = payload.confidence_summary?.reliability ?? (confidence01 >= 0.75 ? "high" : confidence01 >= 0.45 ? "medium" : "low");

  const tier = reliability === "high"
    ? { label: "High", key: "high" }
    : reliability === "medium"
      ? { label: "Medium", key: "medium" }
      : { label: "Low", key: "low" };

  const alternateMatches = (payload.alternates ?? []).slice(0, 5).map((a) => ({
    name: a.strain_name,
    confidencePercent: Math.round(clamp01(a.confidence) * 100),
    whyNotPrimary: a.whyNotPrimary ?? null
  }));

  const traits = payload.traits ?? {};
  const grow = payload.grow_characteristics ?? {};
  const lineage = payload.lineage ?? {};

  // Minimal "FullScanResult-like" structure (viewModel-shaped for WikiStyleResultPanel)
  return {
    nameFirstDisplay: {
      primaryStrainName: primaryName,
      confidencePercent,
      alternateMatches
    },
    name: primaryName,
    confidence: confidencePercent,
    confidenceTier: tier,
    traits: {
      type: (traits.type ?? "unknown"),
      effects: Array.isArray(traits.effects) ? traits.effects : [],
      flavors: Array.isArray(traits.flavors) ? traits.flavors : [],
      terpenes: Array.isArray(traits.terpenes) ? traits.terpenes : []
    },
    grow: {
      difficulty: grow.difficulty ?? "unknown",
      flowerTimeDays: grow.flower_time_days ?? { min: null, max: null },
      yield: grow.yield ?? "unknown"
    },
    lineage: {
      parents: Array.isArray(lineage.parents) ? lineage.parents : [],
      notes: lineage.notes ?? null
    },
    _meta: {
      source: "result_payload_v1",
      model: payload.model ?? null,
      sources: payload.sources ?? []
    }
  };
}

function clamp01(n: any) {
  const x = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Build canonical result_payload (v1.0) from judge/orchestrator ScanResult for persistence.
 * Used when saving scan history from live scanner (no backend process).
 */
export function scanResultToPayloadV1(scanResult: {
  result: { nameFirstDisplay?: any; name?: string; confidence?: number; genetics?: any };
  meta?: { model_version?: string };
}): ScanResultPayloadV1 {
  const r = scanResult.result || {};
  const name = r.nameFirstDisplay?.primaryStrainName ?? r.name ?? null;
  const confidencePercent = r.nameFirstDisplay?.confidencePercent ?? r.confidence ?? 0;
  const confidence01 = clamp01(confidencePercent / 100);
  const alternates = (r.nameFirstDisplay?.alternateMatches ?? []).slice(0, 5).map((a: any) => ({
    strain_id: null,
    strain_name: typeof a === "string" ? a : (a?.name ?? "Unknown"),
    confidence: clamp01(typeof a?.confidence === "number" ? a.confidence / 100 : a?.confidencePercent != null ? a.confidencePercent / 100 : 0),
    whyNotPrimary: a?.whyNotPrimary ?? undefined,
  }));
  const type = (r.genetics as any)?.dominance?.toLowerCase?.() ?? "unknown";
  return {
    version: "1.0",
    scan_id: null,
    model: scanResult.meta?.model_version
      ? { name: "judge-orchestrator", version: scanResult.meta.model_version, timestamp: new Date().toISOString() }
      : { name: "judge-orchestrator", version: "v1", timestamp: new Date().toISOString() },
    primary_match: {
      strain_id: null,
      strain_name: name ?? "Unverified Cultivar (visual match only)",
      confidence: confidence01,
      reasoning: r.nameFirstDisplay?.explanation?.whyThisNameWon ?? [],
    },
    alternates,
    traits: { type, effects: [], flavors: [], terpenes: [] },
    confidence_summary: {
      overall: confidence01,
      reliability: confidence01 >= 0.75 ? "high" : confidence01 >= 0.45 ? "medium" : "low",
    },
    sources: [{ type: "scanner", name: "judge-orchestrator" }],
  };
}
