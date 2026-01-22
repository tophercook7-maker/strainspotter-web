// Phase 4.1.1 — IN-SCAN STRAIN NAMING
// lib/scanner/nameResolver.ts

export function resolvePrimaryStrainName(
  rankedNames: { name: string; score: number }[]
): string {
  if (!rankedNames.length) return "Unknown Cultivar"
  return rankedNames[0].name
}
