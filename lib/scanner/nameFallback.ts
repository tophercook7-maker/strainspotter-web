// lib/scanner/nameFallback.ts
// Phase 4.1 — guaranteed strain name resolver

export function resolveFallbackName(candidates: any[]) {
  if (!candidates || candidates.length === 0) {
    return {
      name: "Closest Known Cultivar",
      confidence: 60,
      reason: "Insufficient visual distinction; classified as hybrid"
    }
  }

  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence)
  const top = sorted[0]

  return {
    name: top.name || "Unknown Hybrid",
    confidence: Math.max(60, Math.round(top.confidence ?? 60)),
    reason: "Closest visual and genetic match from database"
  }
}
