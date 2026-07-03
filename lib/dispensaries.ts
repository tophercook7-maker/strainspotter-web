// lib/dispensaries.ts — shared types + med/rec classification for the
// dispensary finder (OSM Overpass data).

export type DispensaryKind = "medical" | "recreational" | "both" | "unknown";

/**
 * Classify med/rec from OSM cannabis tagging where present:
 * cannabis:medical / cannabis:recreational = yes | no | only.
 * Sparse in some regions — "unknown" is an honest, common answer.
 */
export function classifyDispensary(tags: Record<string, string> | undefined): DispensaryKind {
  const med = tags?.["cannabis:medical"];
  const rec = tags?.["cannabis:recreational"];
  if (med === "only") return "medical";
  if (rec === "only") return "recreational";
  const medYes = med === "yes";
  const recYes = rec === "yes";
  if (medYes && recYes) return "both";
  if (medYes && rec === "no") return "medical";
  if (recYes && med === "no") return "recreational";
  if (medYes) return "medical";
  if (recYes) return "recreational";
  return "unknown";
}
