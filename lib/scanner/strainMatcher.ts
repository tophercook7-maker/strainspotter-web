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
  };
}

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

      // Name similarity
      score += scoreTextSimilarity(gptName, name) * 0.5;

      // Type similarity (indica/sativa/hybrid)
      if (strain.type && gptName.includes(strain.type.toLowerCase())) {
        score += 0.2;
      }

      // Visual traits matching
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

      if (score > 0.25) {
        results.push({
          strainName: strain.name,
          score: Math.min(1, score),
          source: "metadata",
          reasons: ["Matched strain traits (name + structure + color)"],
        });
      }
    }
  }

  return results;
}
