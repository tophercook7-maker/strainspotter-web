import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

export interface GptRankedMatchLike {
  strainName?: string;
  reasons?: unknown;
  scoreBuckets?: {
    visualFlower?: number;
    structure?: number;
    ocr?: number;
    secondary?: number;
  };
}

export interface FusedCandidate {
  strainName: string;
  score: number; // 0 to 100
  sources: Array<"embedding" | "metadata" | "ocr" | "gpt">;
  reasons: string[];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function scoreGptMatch(match: GptRankedMatchLike): number {
  const buckets = match.scoreBuckets ?? {};

  const visualFlower = Number(buckets.visualFlower ?? 0);
  const structure = Number(buckets.structure ?? 0);
  const ocr = Number(buckets.ocr ?? 0);
  const secondary = Number(buckets.secondary ?? 0);

  const total = visualFlower + structure + ocr + secondary;

  return Math.max(0, Math.min(100, total));
}

export function convertGptMatchesToCandidates(
  matches: unknown
): RetrievalCandidate[] {
  if (!Array.isArray(matches)) return [];

  const candidates: RetrievalCandidate[] = [];

  for (const item of matches) {
    if (!item || typeof item !== "object") continue;

    const match = item as GptRankedMatchLike;
    const strainName =
      typeof match.strainName === "string" ? match.strainName.trim() : "";

    if (!strainName) continue;

    candidates.push({
      strainName,
      score: scoreGptMatch(match) / 100,
      source: "gpt",
      reasons: asStringArray(match.reasons),
    });
  }

  return candidates;
}

export function fuseCandidates(
  candidates: RetrievalCandidate[]
): FusedCandidate[] {
  const byName = new Map<
    string,
    {
      strainName: string;
      scores: number[];
      sources: Set<"embedding" | "metadata" | "ocr" | "gpt">;
      reasons: Set<string>;
    }
  >();

  for (const candidate of candidates) {
    const displayName =
      typeof candidate.strainName === "string" ? candidate.strainName.trim() : "";
    if (!displayName) continue;

    const key = displayName.toLowerCase();

    if (!byName.has(key)) {
      byName.set(key, {
        strainName: displayName,
        scores: [],
        sources: new Set(),
        reasons: new Set(),
      });
    }

    const entry = byName.get(key)!;
    entry.scores.push(Number(candidate.score) || 0);
    entry.sources.add(candidate.source);

    for (const reason of candidate.reasons ?? []) {
      if (typeof reason === "string" && reason.trim()) {
        entry.reasons.add(reason.trim());
      }
    }
  }

  const fused: FusedCandidate[] = Array.from(byName.values()).map((entry) => {
    const averageScore =
      entry.scores.length > 0
        ? entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length
        : 0;

    return {
      strainName: entry.strainName,
      score: Math.max(0, Math.min(100, Math.round(averageScore * 100))),
      sources: Array.from(entry.sources),
      reasons: Array.from(entry.reasons),
    };
  });

  fused.sort((a, b) => b.score - a.score);

  return fused;
}
