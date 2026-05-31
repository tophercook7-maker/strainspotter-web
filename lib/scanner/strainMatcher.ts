// lib/scanner/strainMatcher.ts

import strainDb from "@/lib/data/strains.json";
import type { RetrievalCandidate } from "@/lib/scanner/retrievalTypes";

interface StrainEntry {
  name: string;
  aliases?: string[];
  type?: string;
  dominantType?: string;
  visualProfile?: {
    colorProfile?: string;
    budStructure?: string;
    trichomeDensity?: string;
    leafShape?: string;
    pistilColor?: string[];
  };
  terpeneProfile?: string[];
  commonTerpenes?: string[];
  effects?: string[];
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

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

function textContainsName(text: string, strain: StrainEntry): boolean {
  const hay = normalize(text);
  const names = [strain.name, ...(strain.aliases ?? [])]
    .map((name) => normalize(name).trim())
    .filter(Boolean);

  return names.some((name) => hay.includes(name));
}

function keywordOverlap(needles: string[], haystack: string): number {
  const hay = new Set(tokenize(haystack));
  if (!needles.length || !hay.size) return 0;

  let hits = 0;
  for (const needle of needles) {
    if (hay.has(needle)) hits++;
  }

  return hits / Math.max(needles.length, 1);
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

export function generateVisualTraitCandidates(
  analysis: Record<string, unknown>
): RetrievalCandidate[] {
  const strains = strainDb as StrainEntry[];
  const detectedText =
    typeof analysis.detectedText === "string" ? analysis.detectedText : "";
  const visualTraits =
    analysis.visualTraits && typeof analysis.visualTraits === "object"
      ? (analysis.visualTraits as Record<string, unknown>)
      : {};

  const dominantColors = Array.isArray(visualTraits.dominantColors)
    ? visualTraits.dominantColors.filter(
        (value): value is string => typeof value === "string"
      )
    : [];
  const budStructure =
    typeof visualTraits.budStructure === "string"
      ? visualTraits.budStructure
      : "";
  const trichomeDensity =
    typeof visualTraits.trichomeDensity === "string"
      ? visualTraits.trichomeDensity
      : "";
  const pistilColor =
    typeof visualTraits.pistilColor === "string" ? visualTraits.pistilColor : "";
  const possibleType =
    typeof visualTraits.possibleType === "string" ? visualTraits.possibleType : "";

  const textTokens = tokenize(detectedText);
  const visualHaystack = [
    ...dominantColors,
    budStructure,
    trichomeDensity,
    pistilColor,
  ].join(" ");

  const results: RetrievalCandidate[] = [];

  for (const strain of strains) {
    const reasons: string[] = [];
    let score = 0;

    if (detectedText && textContainsName(detectedText, strain)) {
      score += 0.5;
      reasons.push("Detected text matches a catalog strain name or alias");
    } else if (detectedText) {
      const nameOverlap = keywordOverlap(textTokens, strain.name);
      if (nameOverlap > 0) {
        score += Math.min(0.25, nameOverlap * 0.25);
        reasons.push("Detected text partially overlaps the catalog name");
      }
    }

    const type = normalize(strain.dominantType || strain.type || "");
    if (
      possibleType &&
      normalize(possibleType) !== "unknown" &&
      type &&
      type.includes(normalize(possibleType))
    ) {
      score += 0.14;
      reasons.push(`Type estimate aligns with ${strain.type || strain.dominantType}`);
    }

    const vp = strain.visualProfile;
    if (vp) {
      const catalogVisual = [
        vp.colorProfile,
        vp.budStructure,
        vp.trichomeDensity,
        vp.leafShape,
        ...(vp.pistilColor ?? []),
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      const visualOverlap = keywordOverlap(tokenize(visualHaystack), catalogVisual);

      if (visualOverlap > 0) {
        score += Math.min(0.24, visualOverlap * 0.24);
        reasons.push("Visual traits overlap the catalog visual profile");
      }
    }

    const effectsAndTerpenes = [
      ...(strain.effects ?? []),
      ...(strain.terpeneProfile ?? []),
      ...(strain.commonTerpenes ?? []),
    ].join(" ");
    const secondaryOverlap = keywordOverlap(textTokens, effectsAndTerpenes);
    if (secondaryOverlap > 0) {
      score += Math.min(0.08, secondaryOverlap * 0.08);
      reasons.push("Detected text overlaps known effects or terpene metadata");
    }

    if (score >= 0.18) {
      results.push({
        strainName: strain.name,
        score: Math.min(1, score),
        source: "metadata",
        reasons,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
