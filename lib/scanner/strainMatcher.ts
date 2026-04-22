// lib/scanner/strainMatcher.ts

import strainDb from "@/lib/data/strains.json";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

interface StrainEntry {
  name: string;
  type?: string;
  visualProfile?: {
    colorProfile?: string;
    budStructure?: string;
    trichomeDensity?: string;
    leafShape?: string;
    pistilColor?: string[];
  };
}

/** Damp metadata candidates (derived from GPT) so they cannot overpower retrieval. */
const METADATA_SCORE_DAMPING = 0.68;
/** Require clearer trait overlap before surfacing a metadata candidate. */
const METADATA_MIN_RAW_SCORE = 0.34;

function normalize(text: string) {
  return text.toLowerCase();
}

function scoreTextSimilarity(a: string, b: string) {
  if (!a || !b) return 0;

  const aWords = a.split(" ");
  const bWords = b.split(" ");

  let matches = 0;

  for (const word of aWords) {
    if (bWords.includes(word)) matches++;
  }

  return matches / Math.max(aWords.length, 1);
}

/** Light boosts when GPT reason text aligns with catalog visualProfile (bounded). */
function visualKeywordBoostFromReasons(
  gpt: RetrievalCandidate,
  strain: StrainEntry
): number {
  const parts = [...(gpt.reasons ?? []), gpt.strainName].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );
  const hay = normalize(parts.join(" "));
  const vp = strain.visualProfile;
  if (!hay || !vp) return 0;

  const color = (vp.colorProfile ?? "").toLowerCase();
  const bud = (vp.budStructure ?? "").toLowerCase();
  const tri = (vp.trichomeDensity ?? "").toLowerCase();
  const leaf = (vp.leafShape ?? "").toLowerCase();
  const pistil = Array.isArray(vp.pistilColor)
    ? vp.pistilColor.join(" ").toLowerCase()
    : "";

  let b = 0;

  if (hay.includes("purple") && (color.includes("purple") || color.includes("violet"))) {
    b += 0.05;
  }
  if (hay.includes("dense") && bud.includes("dense")) {
    b += 0.04;
  }
  if (hay.includes("airy") && (bud.includes("airy") || bud.includes("open"))) {
    b += 0.04;
  }
  if (
    hay.includes("frosty") &&
    (tri.includes("frost") || tri.includes("dense") || tri.includes("high") || tri.includes("heavy"))
  ) {
    b += 0.04;
  }
  if (
    (hay.includes("orange") && hay.includes("hair")) &&
    (pistil.includes("orange") || color.includes("orange"))
  ) {
    b += 0.04;
  }
  if (
    hay.includes("broad") &&
    hay.includes("leaf") &&
    (leaf.includes("broad") || leaf.includes("wide") || leaf.includes("indica"))
  ) {
    b += 0.04;
  }
  if (
    hay.includes("narrow") &&
    hay.includes("leaf") &&
    (leaf.includes("narrow") || leaf.includes("thin") || leaf.includes("sativa"))
  ) {
    b += 0.04;
  }

  return Math.min(0.15, b);
}

export function generateMetadataCandidates(
  gptCandidates: RetrievalCandidate[]
): RetrievalCandidate[] {
  const strains = strainDb as StrainEntry[];

  const results: RetrievalCandidate[] = [];

  for (const gpt of gptCandidates) {
    const gptName = normalize(gpt.strainName);

    for (const strain of strains) {
      const name = normalize(strain.name);

      let score = 0;

      score += scoreTextSimilarity(gptName, name) * 0.5;

      if (strain.type && gptName.includes(strain.type.toLowerCase())) {
        score += 0.2;
      }

      const vp = strain.visualProfile;

      if (vp?.colorProfile && gptName.includes(vp.colorProfile.toLowerCase())) {
        score += 0.1;
      }

      if (vp?.budStructure && gptName.includes(vp.budStructure.toLowerCase())) {
        score += 0.1;
      }

      if (vp?.leafShape && gptName.includes(vp.leafShape.toLowerCase())) {
        score += 0.1;
      }

      score += visualKeywordBoostFromReasons(gpt, strain);

      const nameWordOverlap = scoreTextSimilarity(gptName, name);
      const hasStrongNameSignal =
        nameWordOverlap >= 0.28 ||
        name.includes(gptName) ||
        gptName.includes(name);
      /** Allow rare high trait-only hits without forcing GPT name overlap. */
      const strongTraitOnly = score >= 0.48;

      if (
        score > METADATA_MIN_RAW_SCORE &&
        (hasStrongNameSignal || strongTraitOnly)
      ) {
        const damped = score * METADATA_SCORE_DAMPING;
        results.push({
          strainName: strain.name,
          score: Math.min(1, damped),
          source: "metadata",
          reasons: ["Matched strain traits (name + structure + color)"],
        });
      }
    }
  }

  return results;
}
