// lib/scanner/scanFusion.ts

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
