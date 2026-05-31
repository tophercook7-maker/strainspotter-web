/**
 * Lightweight comparison of two saved unified scans (v1 — no charts).
 */

import type { SavedUnifiedScan } from "./savedScanTypes";

export type SavedScanComparison = {
  samePrimaryStrain: boolean;
  primaryA: string | null;
  primaryB: string | null;
  /** Top match confidence (0–100). */
  topConfidenceA: number | null;
  topConfidenceB: number | null;
  /** B − A when both present; positive means confidence went up in scan B. */
  confidenceDelta: number | null;
  summaryChanged: boolean;
  stageChanged: boolean;
  healthChanged: boolean;
  typeChanged: boolean;
  /** Human-readable bullets for “What changed”. */
  notes: string[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function primaryStrainName(s: SavedUnifiedScan): string | null {
  const m = s.matches?.[0]?.name?.trim();
  if (m) return m;
  const t = s.topStrainName?.trim();
  return t || null;
}

function topConfidence(s: SavedUnifiedScan): number | null {
  const c = s.matches?.[0]?.confidence;
  if (c == null || !Number.isFinite(Number(c))) return null;
  return Math.round(Number(c));
}

function labelOrNull(
  block: { label?: string } | null | undefined
): string | null {
  if (!block || typeof block !== "object") return null;
  const l = typeof block.label === "string" ? block.label.trim() : "";
  return l || null;
}

function normalizeSummaryText(s: string | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Compare two saved scans. Safe with missing matches, plant blocks, or summaries.
 */
export function compareSavedScans(
  a: SavedUnifiedScan,
  b: SavedUnifiedScan
): SavedScanComparison {
  const primaryA = primaryStrainName(a);
  const primaryB = primaryStrainName(b);
  const samePrimaryStrain =
    primaryA != null &&
    primaryB != null &&
    norm(primaryA) === norm(primaryB);

  const topConfidenceA = topConfidence(a);
  const topConfidenceB = topConfidence(b);
  let confidenceDelta: number | null = null;
  if (topConfidenceA != null && topConfidenceB != null) {
    confidenceDelta = topConfidenceB - topConfidenceA;
  }

  const apiA = normalizeSummaryText(a.apiScanSummary);
  const apiB = normalizeSummaryText(b.apiScanSummary);
  const summaryChanged =
    apiA.length > 0 && apiB.length > 0
      ? apiA !== apiB
      : apiA !== apiB;

  const stageA = labelOrNull(a.plantAnalysis?.growthStage);
  const stageB = labelOrNull(b.plantAnalysis?.growthStage);
  const stageChanged =
    stageA != null &&
    stageB != null &&
    norm(stageA) !== norm(stageB);

  const healthA = labelOrNull(a.plantAnalysis?.health);
  const healthB = labelOrNull(b.plantAnalysis?.health);
  const healthChanged =
    healthA != null &&
    healthB != null &&
    norm(healthA) !== norm(healthB);

  const typeA = labelOrNull(a.plantAnalysis?.typeEstimate);
  const typeB = labelOrNull(b.plantAnalysis?.typeEstimate);
  const typeChanged =
    typeA != null &&
    typeB != null &&
    norm(typeA) !== norm(typeB);

  const notes: string[] = [];

  if (primaryA && primaryB) {
    if (samePrimaryStrain) {
      notes.push(`Primary match is still “${primaryA}”.`);
    } else {
      notes.push(`Primary match changed from “${primaryA}” to “${primaryB}”.`);
    }
  } else if (primaryB && !primaryA) {
    notes.push(`Later scan suggests “${primaryB}” (earlier scan had no clear primary).`);
  } else if (primaryA && !primaryB) {
    notes.push(`Earlier scan suggested “${primaryA}”; later scan has no clear primary.`);
  }

  if (topConfidenceA != null && topConfidenceB != null && confidenceDelta != null) {
    const ad = Math.abs(confidenceDelta);
    if (ad < 2) {
      notes.push("Top match confidence is about the same between the two scans.");
    } else if (confidenceDelta > 0) {
      notes.push(
        `Top match confidence went up by about ${Math.round(confidenceDelta)} points (later vs earlier).`
      );
    } else {
      notes.push(
        `Top match confidence went down by about ${Math.round(-confidenceDelta)} points (later vs earlier).`
      );
    }
  } else {
    notes.push("Confidence could not be compared (missing match data on one side).");
  }

  if (!apiA && !apiB) {
    /* no summary note */
  } else if (summaryChanged) {
    notes.push("The written scan summary / narrative changed between saves.");
  } else if (apiA || apiB) {
    notes.push("Scan summary text matches between these two saves.");
  }

  if (stageA || stageB) {
    if (stageChanged) {
      notes.push(
        `Growth stage estimate changed (${stageA ?? "—"} → ${stageB ?? "—"}).`
      );
    } else if (stageA && stageB) {
      notes.push(`Growth stage estimate is still “${stageA}”.`);
    }
  }

  if (healthA || healthB) {
    if (healthChanged) {
      notes.push(
        `Health estimate changed (${healthA ?? "—"} → ${healthB ?? "—"}).`
      );
    } else if (healthA && healthB) {
      notes.push(`Health estimate is still “${healthA}”.`);
    }
  }

  if (typeChanged) {
    notes.push(
      `Plant type estimate changed (${typeA ?? "—"} → ${typeB ?? "—"}).`
    );
  }

  return {
    samePrimaryStrain,
    primaryA,
    primaryB,
    topConfidenceA,
    topConfidenceB,
    confidenceDelta,
    summaryChanged,
    stageChanged,
    healthChanged,
    typeChanged,
    notes,
  };
}

export function formatScanDate(iso: string | undefined): string {
  if (!iso) return "Unknown date";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Unknown date";
  }
}
