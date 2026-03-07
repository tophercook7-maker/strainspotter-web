// Phase 4.6 — NAME TRUST & DISAMBIGUATION
// lib/scanner/nameTrustV46.ts

/**
 * Phase 4.6 — Name Trust Result
 * 
 * Makes the strain name feel authoritative and human-trustworthy.
 */
export type NameTrustResultV46 = {
  primaryName: string; // Always non-empty, never "Unknown"
  alternates: string[]; // Up to 3 alternates (if scores within 10 pts)
  isLocked: boolean; // If confidence ≥75%, name is locked
  explanation: string; // 1 line, user-facing
  sourcesUsed: string[]; // For logging
  confidence: number; // 0–100
};

/**
 * Phase 4.6 — Name Candidate Score
 * 
 * Internal scoring for name candidates.
 */
type NameCandidateScore = {
  name: string;
  score: number;
  sources: {
    databaseMatch: boolean;
    imageCount: number; // How many images have this name
    visualAlignment: number; // 0–1
    terpeneAlignment: number; // 0–1
  };
};

/**
 * Phase 4.6 — Compute Name Trust V46
 * 
 * Name source weighting:
 * - Database genetics match: +40
 * - Appears in ≥2 images: +25
 * - Visual morphology alignment: +20
 * - Terpene profile alignment: +15
 * 
 * Top score = primary name
 * Scores within 10 pts → alternates
 */
export function computeNameTrustV46(args: {
  candidateNames: string[]; // All candidate names from images/consensus
  databaseMatches: { name: string; hasLineage: boolean; hasTerpenes: boolean }[]; // Database entries that match
  imageNameFrequency: Map<string, number>; // How many images have each name
  visualAlignment: Map<string, number>; // 0–1 alignment score per name
  terpeneAlignment: Map<string, number>; // 0–1 alignment score per name
  confidence: number; // 0–100
}): NameTrustResultV46 {
  const {
    candidateNames,
    databaseMatches,
    imageNameFrequency,
    visualAlignment,
    terpeneAlignment,
    confidence,
  } = args;

  // Safety: Never throw — fallback to "Closest Known Cultivar"
  try {
    // 2) Name source weighting - Score each candidate
    const scoredCandidates: NameCandidateScore[] = [];

    for (const name of candidateNames) {
      if (!name || name.trim().length < 3 || name.toLowerCase() === "unknown") {
        continue; // Skip invalid names
      }

      let score = 0;
      const sources: NameCandidateScore["sources"] = {
        databaseMatch: false,
        imageCount: 0,
        visualAlignment: 0,
        terpeneAlignment: 0,
      };

      // Database genetics match: +40
      const dbMatch = databaseMatches.find(m => m.name === name);
      if (dbMatch) {
        score += 40;
        sources.databaseMatch = true;
      }

      // Appears in ≥2 images: +25
      const imageCount = imageNameFrequency.get(name) || 0;
      if (imageCount >= 2) {
        score += 25;
      }
      sources.imageCount = imageCount;

      // Visual morphology alignment: +20
      const visualScore = visualAlignment.get(name) || 0;
      score += Math.round(visualScore * 20);
      sources.visualAlignment = visualScore;

      // Terpene profile alignment: +15
      const terpeneScore = terpeneAlignment.get(name) || 0;
      score += Math.round(terpeneScore * 15);
      sources.terpeneAlignment = terpeneScore;

      scoredCandidates.push({
        name,
        score,
        sources,
      });
    }

    // Sort by score (descending)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 1) Name locking rule
    const isLocked = confidence >= 75;

    // Determine primary name
    let primaryName: string;
    if (scoredCandidates.length === 0 || scoredCandidates[0].score < 20) {
      // No strong match → "Closest Known Cultivar"
      primaryName = "Closest Known Cultivar";
    } else {
      primaryName = scoredCandidates[0].name;
    }

    // 3) Disambiguation logic - Find alternates (scores within 10 pts)
    const topScore = scoredCandidates[0]?.score || 0;
    const alternates: string[] = [];
    const sourcesUsed: string[] = [];

    for (let i = 1; i < scoredCandidates.length && alternates.length < 3; i++) {
      const candidate = scoredCandidates[i];
      if (topScore - candidate.score <= 10) {
        alternates.push(candidate.name);
      }
    }

    // If multiple strains share name/root, prefer strain with more complete lineage
    if (primaryName !== "Closest Known Cultivar" && databaseMatches.length > 1) {
      // Check if we have multiple DB matches with same root name
      const rootName = primaryName.split(" ")[0]; // Simple root extraction
      const relatedMatches = databaseMatches.filter(m => 
        m.name.startsWith(rootName) || m.name.includes(rootName)
      );

      if (relatedMatches.length > 1) {
        // Prefer strain with more complete lineage
        const bestMatch = relatedMatches.reduce((best, current) => {
          const bestScore = (best.hasLineage ? 2 : 0) + (best.hasTerpenes ? 1 : 0);
          const currentScore = (current.hasLineage ? 2 : 0) + (current.hasTerpenes ? 1 : 0);
          return currentScore > bestScore ? current : best;
        });

        if (bestMatch.name !== primaryName) {
          // Update primary if better match found
          primaryName = bestMatch.name;
          sourcesUsed.push("lineage_preference");
        }
      }
    }

    // Build sources used list
    if (scoredCandidates[0]) {
      const topCandidate = scoredCandidates[0];
      if (topCandidate.sources.databaseMatch) {
        sourcesUsed.push("database");
      }
      if (topCandidate.sources.imageCount >= 2) {
        sourcesUsed.push("multi_image");
      }
      if (topCandidate.sources.visualAlignment > 0.5) {
        sourcesUsed.push("visual");
      }
      if (topCandidate.sources.terpeneAlignment > 0.5) {
        sourcesUsed.push("terpene");
      }
    }

    // 5) Explanation (1 line)
    let explanation: string;
    if (primaryName === "Closest Known Cultivar") {
      explanation = "Name selected based on closest visual match to known cultivars.";
    } else if (sourcesUsed.includes("database") && sourcesUsed.includes("multi_image")) {
      explanation = "Name selected based on repeated visual agreement and reference genetics.";
    } else if (sourcesUsed.includes("database")) {
      explanation = "Name selected based on reference genetics and visual traits.";
    } else if (sourcesUsed.includes("multi_image")) {
      explanation = "Name selected based on repeated visual agreement across images.";
    } else {
      explanation = "Name selected based on visual analysis and trait matching.";
    }

    // 6) Guardrails - Never show empty or "Unknown"
    if (!primaryName || primaryName.trim().length < 3 || primaryName.toLowerCase() === "unknown") {
      primaryName = "Closest Known Cultivar";
    }

    return {
      primaryName,
      alternates,
      isLocked,
      explanation,
      sourcesUsed,
      confidence,
    };
  } catch (error) {
    // Safety: Never throw — fallback to "Closest Known Cultivar"
    console.warn("Phase 4.6 — Name trust calculation error, using fallback:", error);
    return {
      primaryName: "Closest Known Cultivar",
      alternates: [],
      isLocked: false,
      explanation: "Name selected based on closest visual match to known cultivars.",
      sourcesUsed: ["fallback"],
      confidence,
    };
  }
}
