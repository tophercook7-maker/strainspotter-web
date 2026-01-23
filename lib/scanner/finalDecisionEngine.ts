// Phase 5.0.5 — Final Decision Engine
// lib/scanner/finalDecisionEngine.ts

import type { CandidateSet, CandidateMatch } from "./topKCandidateSelection";
import type { FingerprintMatchScore } from "./fingerprintMatching";
import type { ObservedFingerprint } from "./observedFingerprint";
import type { VisualSignature } from "./visualFeatureExtraction";
import type { ImageResult } from "./types";

/**
 * Phase 5.0.5 — Final Decision Result
 * 
 * The final selected strain with confidence and reasoning.
 */
export type FinalDecision = {
  primaryStrainName: string; // Always non-empty, never "Unknown"
  confidence: number; // 0-100, reflects evidence strength
  contradictionScore: number; // 0-1, lower is better (0 = no contradictions)
  crossImageAgreement: number; // 0-1, how well images agree on this strain
  fingerprintScore: number; // 0-1, fingerprint match score
  reasoning: string[]; // Why this strain was selected
  alternates: Array<{
    name: string;
    score: number;
    whyNotPrimary: string;
  }>;
  rejectedButClose: Array<{
    name: string;
    score: number;
    whyRejected: string;
  }>;
};

/**
 * Phase 5.0.5.1 — Calculate Contradiction Score
 * 
 * Measures how much the selected strain contradicts observed data.
 * Lower is better (0 = no contradictions, 1 = many contradictions).
 */
function calculateContradictionScore(
  candidate: CandidateMatch,
  observed: ObservedFingerprint,
  imageResults?: ImageResult[]
): number {
  let contradictions = 0;
  let totalChecks = 0;
  
  // Visual contradictions
  totalChecks++;
  if (candidate.channelScores.visual < 0.4) {
    contradictions += 0.4; // Low visual match = contradiction
  } else if (candidate.channelScores.visual < 0.6) {
    contradictions += 0.2; // Moderate visual match = minor contradiction
  }
  
  // Genetics contradictions
  totalChecks++;
  if (candidate.channelScores.genetics < 0.3) {
    contradictions += 0.3; // Low genetics match = contradiction
  } else if (candidate.channelScores.genetics < 0.5) {
    contradictions += 0.15; // Moderate genetics match = minor contradiction
  }
  
  // Terpene contradictions (if observed terpenes available)
  if (observed.inferredTerpeneVector.likely.length > 0 || observed.inferredTerpeneVector.possible.length > 0) {
    totalChecks++;
    if (candidate.channelScores.terpenes < 0.3) {
      contradictions += 0.2; // Low terpene match = contradiction
    } else if (candidate.channelScores.terpenes < 0.5) {
      contradictions += 0.1; // Moderate terpene match = minor contradiction
    }
  }
  
  // Effect contradictions (if observed effects available)
  if (observed.inferredEffectVector.likely.length > 0 || observed.inferredEffectVector.possible.length > 0) {
    totalChecks++;
    if (candidate.channelScores.effects < 0.3) {
      contradictions += 0.1; // Low effect match = minor contradiction
    }
  }
  
  // Cross-image contradictions (if multiple images)
  if (imageResults && imageResults.length > 1) {
    totalChecks++;
    // Check if images disagree on this strain
    const strainName = candidate.strainName.toLowerCase();
    const appearances = imageResults.filter(result => {
      const topCandidate = result.candidateStrains?.[0];
      return topCandidate?.name.toLowerCase() === strainName;
    }).length;
    
    const agreementRatio = appearances / imageResults.length;
    if (agreementRatio < 0.5) {
      contradictions += 0.3; // Less than 50% images agree = contradiction
    } else if (agreementRatio < 0.7) {
      contradictions += 0.15; // 50-70% agreement = minor contradiction
    }
  }
  
  // Normalize to 0-1
  return totalChecks > 0 ? Math.min(1.0, contradictions / totalChecks) : 0;
}

/**
 * Phase 5.0.5.2 — Calculate Cross-Image Agreement
 * 
 * Measures how well multiple images agree on this strain.
 * Returns 0-1 (1 = all images agree, 0 = no agreement).
 */
function calculateCrossImageAgreement(
  candidate: CandidateMatch,
  imageResults?: ImageResult[]
): number {
  if (!imageResults || imageResults.length <= 1) {
    // Single image: no cross-image agreement to measure
    return 1.0; // Neutral (no disagreement)
  }
  
  const strainName = candidate.strainName.toLowerCase();
  
  // Count how many images have this strain in top candidates
  let appearances = 0;
  let totalRankSum = 0;
  
  for (const result of imageResults) {
    const candidates = result.candidateStrains || [];
    
    // Find this strain in candidates
    const index = candidates.findIndex(c => 
      c.name.toLowerCase() === strainName
    );
    
    if (index >= 0) {
      appearances++;
      // Lower rank (index) = better agreement
      // Rank 0 = +1.0, Rank 1 = +0.8, Rank 2 = +0.6, etc.
      const rankScore = Math.max(0, 1.0 - (index * 0.2));
      totalRankSum += rankScore;
    }
  }
  
  // Agreement ratio
  const agreementRatio = appearances / imageResults.length;
  
  // Average rank score (how high it appears in each image's candidates)
  const avgRankScore = appearances > 0 ? totalRankSum / appearances : 0;
  
  // Combined agreement score
  // 70% weight on agreement ratio, 30% on average rank
  return agreementRatio * 0.7 + avgRankScore * 0.3;
}

/**
 * Phase 5.0.5.3 — Calculate Final Score
 * 
 * Combines fingerprint score, contradiction score, and cross-image agreement.
 */
function calculateFinalScore(
  fingerprintScore: number,
  contradictionScore: number,
  crossImageAgreement: number
): number {
  // Base score from fingerprint (60% weight)
  const fingerprintComponent = fingerprintScore * 0.60;
  
  // Cross-image agreement boost (30% weight)
  const agreementComponent = crossImageAgreement * 0.30;
  
  // Contradiction penalty (10% weight, subtracts from score)
  const contradictionPenalty = contradictionScore * 0.10;
  
  // Final score: base + agreement - contradiction
  const finalScore = Math.max(0, Math.min(1,
    fingerprintComponent + agreementComponent - contradictionPenalty
  ));
  
  return finalScore;
}

/**
 * Phase 5.0.5 — Make Final Decision
 * 
 * Selects primary strain using:
 * - Highest fingerprint score
 * - Lowest contradiction score
 * - Highest cross-image agreement
 * 
 * Guarantees:
 * - Always returns a name (never empty, never "Unknown" unless DB truly lacks match)
 * - Confidence reflects evidence strength
 */
export function makeFinalDecision(
  candidateSet: CandidateSet,
  observed: ObservedFingerprint,
  imageResults?: ImageResult[],
  fingerprintMap?: Map<string, any> // Optional: for additional validation
): FinalDecision {
  // Phase 5.0.5.1 — Calculate scores for all candidates
  const scoredCandidates = [
    candidateSet.primary,
    ...candidateSet.alternates,
  ].map(candidate => {
    const contradictionScore = calculateContradictionScore(candidate, observed, imageResults);
    const crossImageAgreement = calculateCrossImageAgreement(candidate, imageResults);
    const finalScore = calculateFinalScore(
      candidate.overallScore,
      contradictionScore,
      crossImageAgreement
    );
    
    return {
      candidate,
      fingerprintScore: candidate.overallScore,
      contradictionScore,
      crossImageAgreement,
      finalScore,
    };
  });
  
  // Phase 5.0.5.2 — Select primary based on final score
  // Sort by final score (descending), then by fingerprint score, then by lowest contradiction
  scoredCandidates.sort((a, b) => {
    // Primary: final score
    if (Math.abs(a.finalScore - b.finalScore) > 0.01) {
      return b.finalScore - a.finalScore;
    }
    
    // Tie-breaker 1: fingerprint score
    if (Math.abs(a.fingerprintScore - b.fingerprintScore) > 0.01) {
      return b.fingerprintScore - a.fingerprintScore;
    }
    
    // Tie-breaker 2: lowest contradiction (lower is better)
    if (Math.abs(a.contradictionScore - b.contradictionScore) > 0.01) {
      return a.contradictionScore - b.contradictionScore;
    }
    
    // Tie-breaker 3: highest cross-image agreement
    return b.crossImageAgreement - a.crossImageAgreement;
  });
  
  // Phase 5.0.5.3 — Select primary candidate
  const selected = scoredCandidates[0];
  const primaryCandidate = selected.candidate;
  
  // Phase 5.0.6 — CONFIDENCE CALIBRATION (REALISTIC)
  // Confidence is based on:
  // - Fingerprint separation (gap to #2)
  // - Multi-image agreement
  // - Visual + genetic alignment
  
  const imageCount = imageResults?.length || 1;
  
  // Phase 5.0.6.1 — Calculate fingerprint separation (gap to #2 candidate)
  const fingerprintSeparation = scoredCandidates.length > 1
    ? selected.fingerprintScore - scoredCandidates[1].fingerprintScore
    : selected.fingerprintScore; // If only one candidate, use full score as separation
  
  // Phase 5.0.6.2 — Calculate visual + genetic alignment
  const visualAlignment = primaryCandidate.channelScores.visual;
  const geneticAlignment = primaryCandidate.channelScores.genetics;
  const alignmentScore = (visualAlignment + geneticAlignment) / 2; // Average alignment
  
  // Phase 5.0.6.3 — Base confidence calculation
  // Start with fingerprint score
  let confidence = selected.fingerprintScore * 100;
  
  // Boost for fingerprint separation (clear winner)
  // Large gap (>0.15) = +5%, Medium gap (0.10-0.15) = +3%, Small gap (<0.10) = +1%
  if (fingerprintSeparation > 0.15) {
    confidence += 5;
  } else if (fingerprintSeparation > 0.10) {
    confidence += 3;
  } else if (fingerprintSeparation > 0.05) {
    confidence += 1;
  }
  
  // Boost for multi-image agreement
  if (imageCount > 1) {
    const agreementBoost = Math.round(selected.crossImageAgreement * 15); // Up to +15 points
    confidence += agreementBoost;
  }
  
  // Boost for visual + genetic alignment
  const alignmentBoost = Math.round(alignmentScore * 10); // Up to +10 points
  confidence += alignmentBoost;
  
  // Penalty for contradictions
  const contradictionPenalty = Math.round(selected.contradictionScore * 15); // Up to -15 points
  confidence -= contradictionPenalty;
  
  // Phase 5.0.6.4 — Apply image count caps
  // Rules:
  // - 1 image → cap ~82%
  // - 2 images → cap ~90%
  // - 3–5 images → up to 97–99%
  // - Never show 100%
  let imageCountCap: number;
  if (imageCount === 1) {
    imageCountCap = 82;
  } else if (imageCount === 2) {
    imageCountCap = 90;
  } else if (imageCount >= 3 && imageCount <= 5) {
    // 3-5 images: up to 97-99% based on evidence strength
    if (selected.fingerprintScore >= 0.9 && 
        selected.crossImageAgreement >= 0.9 && 
        selected.contradictionScore < 0.1) {
      imageCountCap = 99; // Very strong evidence
    } else if (selected.fingerprintScore >= 0.85 && 
               selected.crossImageAgreement >= 0.85 && 
               selected.contradictionScore < 0.2) {
      imageCountCap = 97; // Strong evidence
    } else {
      imageCountCap = 95; // Good evidence
    }
  } else {
    // 6+ images: same as 3-5
    imageCountCap = 97;
  }
  
  // Apply cap
  confidence = Math.min(confidence, imageCountCap);
  
  // Phase 5.0.6.5 — Never show 100%
  confidence = Math.min(confidence, 99);
  
  // Phase 5.0.6.6 — Floor: never below 50% for valid scans
  confidence = Math.max(50, confidence);
  
  // Round to integer
  confidence = Math.round(confidence);
  
  // Phase 5.0.5.5 — Build reasoning
  const reasoning: string[] = [];
  reasoning.push(`Fingerprint match: ${Math.round(selected.fingerprintScore * 100)}%`);
  
  // Add fingerprint separation note
  if (fingerprintSeparation > 0.15) {
    reasoning.push(`Clear winner (${Math.round(fingerprintSeparation * 100)}% above #2 candidate)`);
  } else if (fingerprintSeparation > 0.05) {
    reasoning.push(`Moderate separation (${Math.round(fingerprintSeparation * 100)}% above #2 candidate)`);
  } else if (scoredCandidates.length > 1) {
    reasoning.push(`Close match (${Math.round(fingerprintSeparation * 100)}% above #2 candidate)`);
  }
  
  reasoning.push(`Cross-image agreement: ${Math.round(selected.crossImageAgreement * 100)}%`);
  reasoning.push(`Visual + genetic alignment: ${Math.round(alignmentScore * 100)}%`);
  reasoning.push(`Contradiction score: ${Math.round(selected.contradictionScore * 100)}% (lower is better)`);
  
  // Add image count cap note
  if (imageCount === 1) {
    reasoning.push(`Single image analysis — confidence capped at 82%`);
  } else if (imageCount === 2) {
    reasoning.push(`Two images analyzed — confidence capped at 90%`);
  } else if (imageCount >= 3) {
    reasoning.push(`${imageCount} images analyzed — confidence capped at ${imageCountCap}%`);
  }
  
  if (selected.crossImageAgreement >= 0.8) {
    reasoning.push("Strong agreement across multiple images");
  } else if (selected.crossImageAgreement >= 0.6) {
    reasoning.push("Good agreement across images");
  } else if (imageCount > 1) {
    reasoning.push("Some variation in image agreement");
  }
  
  if (selected.contradictionScore < 0.2) {
    reasoning.push("No significant contradictions detected");
  } else if (selected.contradictionScore < 0.4) {
    reasoning.push("Minor contradictions present");
  } else {
    reasoning.push("Some contradictions detected — confidence reduced");
  }
  
  // Phase 5.0.5.6 — Format alternates
  const alternates = scoredCandidates
    .slice(1, 11) // Top 10 alternates (excluding primary)
    .map(scored => {
      const scoreDiff = selected.finalScore - scored.finalScore;
      let whyNotPrimary = "";
      
      if (scored.contradictionScore > selected.contradictionScore + 0.1) {
        whyNotPrimary = `Higher contradiction score (${Math.round(scored.contradictionScore * 100)}% vs ${Math.round(selected.contradictionScore * 100)}%)`;
      } else if (scored.crossImageAgreement < selected.crossImageAgreement - 0.1) {
        whyNotPrimary = `Lower cross-image agreement (${Math.round(scored.crossImageAgreement * 100)}% vs ${Math.round(selected.crossImageAgreement * 100)}%)`;
      } else if (scoreDiff < 0.05) {
        whyNotPrimary = `Very close match (${Math.round(scoreDiff * 100)}% lower final score)`;
      } else {
        whyNotPrimary = `Lower final score (${Math.round(scoreDiff * 100)}% lower)`;
      }
      
      return {
        name: scored.candidate.strainName,
        score: scored.finalScore,
        whyNotPrimary,
      };
    });
  
  // Phase 5.0.5.7 — Format rejected but close
  const rejectedButClose = candidateSet.rejectedButClose.map(rejected => {
    const scoreDiff = selected.finalScore - rejected.overallScore;
    let whyRejected = "";
    
    if (scoreDiff < 0.2) {
      whyRejected = `Close runner-up (${Math.round(scoreDiff * 100)}% below primary)`;
    } else {
      whyRejected = `Runner-up (${Math.round(scoreDiff * 100)}% below primary)`;
    }
    
    return {
      name: rejected.strainName,
      score: rejected.overallScore,
      whyRejected,
    };
  });
  
  // Phase 5.0.5.8 — GUARANTEE: Always return a name
  let primaryStrainName = primaryCandidate.strainName;
  
  // Safety check: Never return empty or "Unknown" unless DB truly lacks match
  if (!primaryStrainName || 
      primaryStrainName.trim().length < 3 ||
      primaryStrainName.toLowerCase() === "unknown") {
    // Fallback to "Closest Known Cultivar" if no valid name
    primaryStrainName = "Closest Known Cultivar";
    confidence = Math.max(50, confidence - 10); // Reduce confidence for fallback
    reasoning.push("Using fallback name — no valid match found in database");
  }
  
  // Phase 5.0.6 — Confidence already calibrated above with realistic caps
  // No additional calibration needed — confidence reflects:
  // - Fingerprint separation
  // - Multi-image agreement
  // - Visual + genetic alignment
  // - Image count caps (1 image = 82%, 2 images = 90%, 3-5 images = 97-99%)
  // - Never 100%
  
  return {
    primaryStrainName,
    confidence,
    contradictionScore: selected.contradictionScore,
    crossImageAgreement: selected.crossImageAgreement,
    fingerprintScore: selected.fingerprintScore,
    reasoning,
    alternates,
    rejectedButClose,
  };
}

/**
 * Phase 5.0.5 — Validate Final Decision
 * 
 * Ensures the final decision meets all guarantees.
 */
export function validateFinalDecision(decision: FinalDecision): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Guarantee 1: Always returns a name
  if (!decision.primaryStrainName || decision.primaryStrainName.trim().length < 3) {
    errors.push("Primary strain name is empty or too short");
  }
  
  if (decision.primaryStrainName.toLowerCase() === "unknown") {
    errors.push("Primary strain name is 'Unknown' — should use 'Closest Known Cultivar'");
  }
  
  // Guarantee 2: Confidence reflects evidence strength
  if (decision.confidence < 50) {
    errors.push(`Confidence (${decision.confidence}%) is below minimum (50%)`);
  }
  
  if (decision.confidence > 100) {
    errors.push(`Confidence (${decision.confidence}%) exceeds maximum (100%)`);
  }
  
  // Validate scores are in range
  if (decision.fingerprintScore < 0 || decision.fingerprintScore > 1) {
    errors.push(`Fingerprint score (${decision.fingerprintScore}) is out of range [0-1]`);
  }
  
  if (decision.contradictionScore < 0 || decision.contradictionScore > 1) {
    errors.push(`Contradiction score (${decision.contradictionScore}) is out of range [0-1]`);
  }
  
  if (decision.crossImageAgreement < 0 || decision.crossImageAgreement > 1) {
    errors.push(`Cross-image agreement (${decision.crossImageAgreement}) is out of range [0-1]`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
