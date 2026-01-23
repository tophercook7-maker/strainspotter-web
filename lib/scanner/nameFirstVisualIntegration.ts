// Phase 4.9.5 — Name-First Integration
// lib/scanner/nameFirstVisualIntegration.ts

import type { NameMatchCandidate } from "./nameFirstMatchingEngine";
import type { CultivarReference } from "./cultivarLibrary";
import type { VisualConsensusResult } from "./imageStrainMatchScoring";
import type { VisualSignature } from "./visualFeatureExtraction";
import { calculateMultiImageVisualConsensus, calculateImageStrainMatchScore } from "./imageStrainMatchScoring";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 4.9.5 — Integrated Name-First Score
 * Combines name consensus, genetic similarity, terpene overlap, and visual consensus
 */
export type IntegratedNameFirstScore = {
  strainName: string;
  nameScore: number; // 0-100, from name-first matching
  visualConsensusScore: number; // 0-1, from visual consensus
  geneticSimilarity: number; // 0-1, calculated from lineage/genetics
  terpeneOverlap: number; // 0-1, calculated from terpene profile overlap
  integratedScore: number; // 0-100, final combined score
  confidenceCeiling: number; // 0-100, maximum confidence (increased by visual score)
  isFalsePositive: boolean; // True if visual score suggests this is wrong
  tieBreaker: {
    used: boolean; // True if visual score broke a tie
    reason: string; // Why visual score was used
  };
  explanation: string[]; // Human-readable explanation
};

/**
 * Phase 4.9.5 — Calculate Genetic Similarity
 * Compares observed genetics/lineage to database strain genetics
 */
function calculateGeneticSimilarity(
  observedGenetics: string | undefined,
  strain: CultivarReference
): number {
  if (!observedGenetics || !strain.genetics) return 0.5; // Default neutral
  
  const observedLower = observedGenetics.toLowerCase();
  const strainGeneticsLower = strain.genetics.toLowerCase();
  
  // Exact match
  if (observedLower === strainGeneticsLower) {
    return 1.0;
  }
  
  // Extract parent names from genetics (format: "Parent1 × Parent2")
  const extractParents = (genetics: string): string[] => {
    return genetics
      .split(/[×x/]/)
      .map(p => p.trim().toLowerCase())
      .filter(p => p.length > 0);
  };
  
  const observedParents = extractParents(observedGenetics);
  const strainParents = extractParents(strain.genetics);
  
  if (observedParents.length === 0 || strainParents.length === 0) {
    return 0.5; // Can't compare
  }
  
  // Calculate overlap
  const overlap = observedParents.filter(obs => 
    strainParents.some(strain => strain.includes(obs) || obs.includes(strain))
  ).length;
  
  const maxParents = Math.max(observedParents.length, strainParents.length);
  return overlap / maxParents;
}

/**
 * Phase 4.9.5 — Calculate Terpene Overlap
 * Compares observed terpenes to database strain terpenes
 */
function calculateTerpeneOverlap(
  observedTerpenes: string[] | undefined,
  strain: CultivarReference
): number {
  if (!observedTerpenes || observedTerpenes.length === 0) return 0.5; // Default neutral
  if (!strain.terpeneProfile || strain.terpeneProfile.length === 0) return 0.5; // Default neutral
  
  const observedLower = observedTerpenes.map(t => t.toLowerCase().trim());
  const strainLower = strain.terpeneProfile.map(t => t.toLowerCase().trim());
  
  // Calculate Jaccard similarity
  const intersection = observedLower.filter(obs => 
    strainLower.some(strain => strain.includes(obs) || obs.includes(strain))
  ).length;
  
  const union = new Set([...observedLower, ...strainLower]).size;
  
  if (union === 0) return 0.5;
  
  return intersection / union;
}

/**
 * Phase 4.9.5 — Integrate Name-First with Visual Consensus
 * 
 * Combines:
 * - Name consensus (from Phase B.1)
 * - Genetic similarity
 * - Terpene overlap
 * - VisualConsensusScore
 * 
 * Visual score can:
 * - Break name ties
 * - Demote false positives
 * - Increase confidence ceiling
 */
export function integrateNameFirstWithVisual(
  nameCandidates: NameMatchCandidate[],
  visualSignatures: VisualSignature[],
  observedTerpenes?: string[],
  observedGenetics?: string
): IntegratedNameFirstScore[] {
  if (nameCandidates.length === 0) return [];
  
  // Phase 4.9.5.1 — Get database entries for all candidates
  const candidatesWithDb = nameCandidates
    .map(candidate => {
      const dbEntry = CULTIVAR_LIBRARY.find(s =>
        s.name.toLowerCase() === candidate.strainName.toLowerCase() ||
        s.aliases?.some(a => a.toLowerCase() === candidate.strainName.toLowerCase())
      );
      return dbEntry ? { candidate, dbEntry } : null;
    })
    .filter((item): item is { candidate: NameMatchCandidate; dbEntry: CultivarReference } => item !== null);
  
  // Phase 4.9.5.2 — Calculate integrated scores
  const integratedScores: IntegratedNameFirstScore[] = candidatesWithDb.map(({ candidate, dbEntry }) => {
    // Calculate visual consensus score
    let visualConsensusScore = 0;
    let visualConsensusResult: VisualConsensusResult | null = null;
    
    if (visualSignatures.length > 0) {
      if (visualSignatures.length === 1) {
        // Single image: Use simple visual match
        const matchResult = calculateImageStrainMatchScore(visualSignatures[0], dbEntry);
        visualConsensusScore = matchResult.visualMatchScore;
      } else {
        // Multi-image: Use consensus
        visualConsensusResult = calculateMultiImageVisualConsensus(visualSignatures, dbEntry);
        visualConsensusScore = visualConsensusResult.visualConsensusScore;
      }
    }
    
    // Calculate genetic similarity
    const geneticSimilarity = calculateGeneticSimilarity(observedGenetics, dbEntry);
    
    // Calculate terpene overlap
    const terpeneOverlap = calculateTerpeneOverlap(observedTerpenes, dbEntry);
    
    // Phase 4.9.5.3 — Calculate integrated score
    // Weights: Name 40%, Visual 30%, Genetics 15%, Terpenes 15%
    const nameWeight = 0.40;
    const visualWeight = 0.30;
    const geneticWeight = 0.15;
    const terpeneWeight = 0.15;
    
    const normalizedNameScore = candidate.score / 100; // 0-1
    const integratedScore = Math.round(
      (normalizedNameScore * nameWeight +
       visualConsensusScore * visualWeight +
       geneticSimilarity * geneticWeight +
       terpeneOverlap * terpeneWeight) * 100
    );
    
    // Phase 4.9.5.4 — Determine if false positive (visual score very low)
    const isFalsePositive = visualConsensusScore < 0.3 && candidate.score < 80;
    
    // Phase 4.9.5.5 — Calculate confidence ceiling
    // Base ceiling from name score, increased by visual score
    let confidenceCeiling = candidate.score;
    if (visualConsensusScore >= 0.8) {
      // Strong visual match increases ceiling
      confidenceCeiling = Math.min(99, candidate.score + 10);
    } else if (visualConsensusScore >= 0.6) {
      confidenceCeiling = Math.min(97, candidate.score + 5);
    } else if (visualConsensusScore < 0.4) {
      // Weak visual match reduces ceiling
      confidenceCeiling = Math.max(70, candidate.score - 10);
    }
    
    // Phase 4.9.5.6 — Check for tie-breaking
    const tieBreaker = {
      used: false,
      reason: "",
    };
    
    // Build explanation
    const explanation: string[] = [];
    explanation.push(`Name match: ${candidate.score}% (${candidate.reasonTags.join(", ")})`);
    explanation.push(`Visual consensus: ${Math.round(visualConsensusScore * 100)}%`);
    explanation.push(`Genetic similarity: ${Math.round(geneticSimilarity * 100)}%`);
    explanation.push(`Terpene overlap: ${Math.round(terpeneOverlap * 100)}%`);
    explanation.push(`Integrated score: ${integratedScore}%`);
    
    if (isFalsePositive) {
      explanation.push("⚠️ Low visual match suggests this may be a false positive");
    }
    
    if (visualConsensusScore >= 0.8) {
      explanation.push("✓ Strong visual alignment increases confidence ceiling");
    }
    
    return {
      strainName: candidate.strainName,
      nameScore: candidate.score,
      visualConsensusScore,
      geneticSimilarity,
      terpeneOverlap,
      integratedScore,
      confidenceCeiling,
      isFalsePositive,
      tieBreaker,
      explanation,
    };
  });
  
  // Phase 4.9.5.7 — Break ties using visual score
  // Sort by integrated score first, then by visual score for ties
  integratedScores.sort((a, b) => {
    // Primary sort: integrated score
    if (Math.abs(a.integratedScore - b.integratedScore) > 2) {
      return b.integratedScore - a.integratedScore;
    }
    
    // Tie: Use visual score as tie-breaker
    if (Math.abs(a.visualConsensusScore - b.visualConsensusScore) > 0.05) {
      a.tieBreaker.used = true;
      a.tieBreaker.reason = `Visual score (${Math.round(a.visualConsensusScore * 100)}%) broke tie with ${b.strainName}`;
      b.tieBreaker.used = true;
      b.tieBreaker.reason = `Visual score (${Math.round(b.visualConsensusScore * 100)}%) broke tie with ${a.strainName}`;
      return b.visualConsensusScore - a.visualConsensusScore;
    }
    
    // Still tied: Use name score
    return b.nameScore - a.nameScore;
  });
  
  // Phase 4.9.5.8 — Demote false positives
  // Move false positives down in ranking (but don't remove them)
  const falsePositives = integratedScores.filter(s => s.isFalsePositive);
  const truePositives = integratedScores.filter(s => !s.isFalsePositive);
  
  // Re-sort: true positives first, then false positives
  const reorderedScores = [...truePositives, ...falsePositives];
  
  // Apply demotion penalty to false positives
  reorderedScores.forEach((score, index) => {
    if (score.isFalsePositive && index < truePositives.length + 3) {
      // Demote by reducing integrated score
      score.integratedScore = Math.max(0, score.integratedScore - 15);
      score.explanation.push("⚠️ Demoted due to low visual match (possible false positive)");
    }
  });
  
  return reorderedScores;
}

/**
 * Phase 4.9.5 — Apply Visual Integration to Phase B.1 Results
 * 
 * Takes Phase B.1 name-first results and integrates visual consensus
 * Returns updated candidates with integrated scores
 */
export function applyVisualIntegrationToNameFirst(
  phaseB1Result: {
    candidates: NameMatchCandidate[];
    primaryStrainName: string;
    confidence: number;
    explanation: string[];
  },
  visualSignatures: VisualSignature[],
  observedTerpenes?: string[],
  observedGenetics?: string
): {
  candidates: Array<NameMatchCandidate & {
    integratedScore: number;
    visualConsensusScore: number;
    confidenceCeiling: number;
    isFalsePositive: boolean;
  }>;
  primaryStrainName: string;
  confidence: number;
  explanation: string[];
  visualIntegrationNote?: string;
  visualContradictionNote?: string; // Phase 4.9.7 — Visual contradiction note
} {
  // Calculate integrated scores
  const integratedScores = integrateNameFirstWithVisual(
    phaseB1Result.candidates,
    visualSignatures,
    observedTerpenes,
    observedGenetics
  );
  
  // Update candidates with integrated scores
  const updatedCandidates = phaseB1Result.candidates.map(candidate => {
    const integrated = integratedScores.find(s => s.strainName === candidate.strainName);
    if (integrated) {
      return {
        ...candidate,
        score: integrated.integratedScore, // Update score to integrated score
        integratedScore: integrated.integratedScore,
        visualConsensusScore: integrated.visualConsensusScore,
        confidenceCeiling: integrated.confidenceCeiling,
        isFalsePositive: integrated.isFalsePositive,
      } as NameMatchCandidate & {
        integratedScore: number;
        visualConsensusScore: number;
        confidenceCeiling: number;
        isFalsePositive: boolean;
      };
    }
    return {
      ...candidate,
      integratedScore: candidate.score,
      visualConsensusScore: 0,
      confidenceCeiling: candidate.score,
      isFalsePositive: false,
    } as NameMatchCandidate & {
      integratedScore: number;
      visualConsensusScore: number;
      confidenceCeiling: number;
      isFalsePositive: boolean;
    };
  });
  
  // Re-sort by integrated score
  updatedCandidates.sort((a, b) => b.integratedScore - a.integratedScore);
  
  // Select primary strain from top integrated score
  const topCandidate = updatedCandidates[0];
  const primaryStrainName = topCandidate ? topCandidate.strainName : phaseB1Result.primaryStrainName;
  
  // Phase 4.9.7 — SAFETY: Detect visual contradictions
  // If visuals contradict name (high name score but low visual score), lower confidence
  let confidence = topCandidate 
    ? Math.min(topCandidate.confidenceCeiling, topCandidate.integratedScore)
    : phaseB1Result.confidence;
  
  let hasVisualContradiction = false;
  let visualContradictionNote: string | undefined = undefined;
  
  if (topCandidate) {
    // Get name score from original candidate or integrated scores
    const integratedScore = integratedScores.find(s => s.strainName === topCandidate.strainName);
    const nameScore = integratedScore?.nameScore ?? topCandidate.score ?? 0;
    const visualScore = topCandidate.visualConsensusScore;
    
    // Phase 4.9.7 — Contradiction detection: High name score (≥80) but low visual score (<0.4)
    if (nameScore >= 80 && visualScore < 0.4) {
      hasVisualContradiction = true;
      
      // Lower confidence by 10-15 points (but never below 60)
      const contradictionPenalty = Math.min(15, Math.max(10, Math.round((nameScore - (visualScore * 100)) / 10)));
      confidence = Math.max(60, confidence - contradictionPenalty);
      
      // Add user-facing note
      visualContradictionNote = "Visual traits differ from typical reference examples";
      
      console.log("Phase 4.9.7 — Visual contradiction detected:", {
        nameScore,
        visualScore,
        originalConfidence: topCandidate.confidenceCeiling,
        adjustedConfidence: confidence,
        penalty: contradictionPenalty,
      });
    }
  }
  
  // Use confidence ceiling for final confidence (after contradiction penalty)
  confidence = topCandidate 
    ? Math.min(topCandidate.confidenceCeiling, confidence)
    : phaseB1Result.confidence;
  
  // Build explanation
  const explanation = [...phaseB1Result.explanation];
  if (topCandidate && topCandidate.visualConsensusScore > 0) {
    explanation.push(`Visual consensus: ${Math.round(topCandidate.visualConsensusScore * 100)}%`);
    if (hasVisualContradiction) {
      explanation.push(`⚠️ ${visualContradictionNote}`);
      explanation.push("Confidence reduced due to visual mismatch");
    } else if (topCandidate.isFalsePositive) {
      explanation.push("⚠️ Low visual match — confidence reduced");
    } else if (topCandidate.visualConsensusScore >= 0.8) {
      explanation.push("✓ Strong visual alignment increases confidence");
    }
  }
  
  // Generate integration note
  const visualIntegrationNote = topCandidate && topCandidate.visualConsensusScore > 0
    ? `Visual consensus integrated: ${Math.round(topCandidate.visualConsensusScore * 100)}% match`
    : undefined;
  
  return {
    candidates: updatedCandidates,
    primaryStrainName,
    confidence,
    explanation,
    visualIntegrationNote,
    visualContradictionNote, // Phase 4.9.7 — Add contradiction note
  };
}
