// Phase 4.0.6 — Angle Diversity Scoring
// Phase 4.0.8 — Angle Diversity Scoring
// lib/scanner/angleDiversity.ts

export type ImageAngle = "TOP" | "SIDE" | "CLOSE" | "UNKNOWN"

// Phase 4.0.8 — Compute angle diversity with ImageAngle type
export function computeAngleDiversity(angles: ImageAngle[]): number {
  const unique = new Set(angles.filter(a => a !== "UNKNOWN"))
  return unique.size / Math.max(1, angles.length)
}

// Phase 4.0.6 — Legacy function for string labels (kept for backward compatibility)
// Converts string labels to ImageAngle format
export function computeAngleDiversityFromLabels(labels: string[]): number {
  // Convert labels to ImageAngle format
  const angles: ImageAngle[] = labels.map(label => {
    const lower = label.toLowerCase()
    if (lower.includes("top")) return "TOP"
    if (lower.includes("side")) return "SIDE"
    if (lower.includes("close") || lower.includes("macro")) return "CLOSE"
    return "UNKNOWN"
  })
  return computeAngleDiversity(angles)
}
