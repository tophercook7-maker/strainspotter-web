// Phase 5.0.4 — Top-K Candidate Selection
// lib/scanner/topKCandidateSelection.ts

import type { FingerprintMatchScore } from "./fingerprintMatching";
import type { StrainFingerprint } from "./strainFingerprintModel";
import { calculateFingerprintSimilarity } from "./strainFingerprintModel";

/**
 * Phase 5.0.4 — Candidate Set
 * 
 * Organized candidate selection with primary, alternates, and close rejects.
 */
export type CandidateSet = {
  primary: CandidateMatch;
  alternates: CandidateMatch[];
  rejectedButClose: CandidateMatch[];
};

/**
 * Phase 5.0.4 — Candidate Match
 * 
 * Enhanced match with grouping and explanation.
 */
export type CandidateMatch = {
  strainName: string;
  overallScore: number; // 0-1
  channelScores: FingerprintMatchScore["channelScores"];
  confidence: number; // 0-100
  explanation: string[];
  groupId?: string; // If part of a clone/pheno group
  groupMembers?: string[]; // Other strains in the same group
  isClone?: boolean; // True if this is a clone/pheno variant
  fingerprintSimilarity?: number; // Similarity to other group members
};

/**
 * Phase 5.0.4.1 — Group Clones and Phenos
 * 
 * Groups strains that are likely the same cultivar (clones/phenos).
 * Uses fingerprint similarity to detect groups.
 */
function groupClonesAndPhenos(
  matches: FingerprintMatchScore[],
  fingerprintMap: Map<string, StrainFingerprint>,
  similarityThreshold: number = 0.85 // 85% similarity = same group
): Map<string, string[]> {
  const groups = new Map<string, string[]>(); // groupId -> strain names
  const strainToGroup = new Map<string, string>(); // strain name -> groupId
  
  for (let i = 0; i < matches.length; i++) {
    const match1 = matches[i];
    const fingerprint1 = fingerprintMap.get(match1.strainName);
    if (!fingerprint1) continue;
    
    // Check if already in a group
    if (strainToGroup.has(match1.strainName)) {
      continue;
    }
    
    // Create new group
    const groupId = `group_${i}`;
    const groupMembers = [match1.strainName];
    strainToGroup.set(match1.strainName, groupId);
    
    // Find similar strains (clones/phenos)
    for (let j = i + 1; j < matches.length; j++) {
      const match2 = matches[j];
      const fingerprint2 = fingerprintMap.get(match2.strainName);
      if (!fingerprint2) continue;
      
      // Skip if already in a group
      if (strainToGroup.has(match2.strainName)) {
        continue;
      }
      
      // Calculate fingerprint similarity
      const similarity = calculateFingerprintSimilarity(fingerprint1, fingerprint2);
      
      // If very similar, add to same group
      if (similarity >= similarityThreshold) {
        groupMembers.push(match2.strainName);
        strainToGroup.set(match2.strainName, groupId);
      }
    }
    
    // Only create group if multiple members
    if (groupMembers.length > 1) {
      groups.set(groupId, groupMembers);
    }
  }
  
  return groups;
}

/**
 * Phase 5.0.4.2 — Collapse Near-Identical Fingerprints
 * 
 * Removes duplicates where fingerprints are nearly identical (>95% similar).
 * Keeps the highest-scoring match from each near-identical group.
 */
function collapseNearIdentical(
  matches: FingerprintMatchScore[],
  fingerprintMap: Map<string, StrainFingerprint>,
  collapseThreshold: number = 0.95 // 95% similarity = near-identical
): FingerprintMatchScore[] {
  const collapsed: FingerprintMatchScore[] = [];
  const used = new Set<string>();
  
  for (const match of matches) {
    // Skip if already collapsed into another match
    if (used.has(match.strainName)) {
      continue;
    }
    
    const fingerprint1 = fingerprintMap.get(match.strainName);
    if (!fingerprint1) {
      collapsed.push(match);
      continue;
    }
    
    // Find near-identical matches
    const nearIdentical: FingerprintMatchScore[] = [match];
    
    for (const otherMatch of matches) {
      if (otherMatch.strainName === match.strainName || used.has(otherMatch.strainName)) {
        continue;
      }
      
      const fingerprint2 = fingerprintMap.get(otherMatch.strainName);
      if (!fingerprint2) continue;
      
      const similarity = calculateFingerprintSimilarity(fingerprint1, fingerprint2);
      
      if (similarity >= collapseThreshold) {
        nearIdentical.push(otherMatch);
        used.add(otherMatch.strainName);
      }
    }
    
    // Keep the highest-scoring match from near-identical group
    nearIdentical.sort((a, b) => b.overallScore - a.overallScore);
    collapsed.push(nearIdentical[0]);
    
    // Mark all others as used
    for (let i = 1; i < nearIdentical.length; i++) {
      used.add(nearIdentical[i].strainName);
    }
  }
  
  return collapsed;
}

/**
 * Phase 5.0.4.3 — Select Top-K Candidates
 * 
 * Keeps top 25 matches, groups clones/phenos, collapses near-identical.
 */
export function selectTopKCandidates(
  matches: FingerprintMatchScore[],
  fingerprintMap: Map<string, StrainFingerprint>,
  topK: number = 25
): CandidateSet {
  if (matches.length === 0) {
    // Return empty candidate set
    return {
      primary: {
        strainName: "Closest Known Cultivar",
        overallScore: 0,
        channelScores: { visual: 0, genetics: 0, terpenes: 0, effects: 0 },
        confidence: 0,
        explanation: ["No matches found"],
      },
      alternates: [],
      rejectedButClose: [],
    };
  }
  
  // Step 1: Collapse near-identical fingerprints (>95% similar)
  const collapsed = collapseNearIdentical(matches, fingerprintMap, 0.95);
  
  // Step 2: Keep top K (after collapsing)
  const topMatches = collapsed.slice(0, topK);
  
  // Step 3: Group clones and phenos (85% similar)
  const groups = groupClonesAndPhenos(topMatches, fingerprintMap, 0.85);
  
  // Step 4: Build candidate matches with group info
  const candidateMatches: CandidateMatch[] = topMatches.map(match => {
    const candidate: CandidateMatch = {
      strainName: match.strainName,
      overallScore: match.overallScore,
      channelScores: match.channelScores,
      confidence: match.confidence,
      explanation: match.explanation,
    };
    
    // Check if part of a group
    for (const [groupId, members] of groups.entries()) {
      if (members.includes(match.strainName)) {
        candidate.groupId = groupId;
        candidate.groupMembers = members.filter(m => m !== match.strainName); // Exclude self
        candidate.isClone = members.length > 1;
        
        // Calculate average similarity to group members
        const fingerprint1 = fingerprintMap.get(match.strainName);
        if (fingerprint1 && candidate.groupMembers.length > 0) {
          const similarities = candidate.groupMembers
            .map(memberName => {
              const fingerprint2 = fingerprintMap.get(memberName);
              if (!fingerprint2) return 0;
              return calculateFingerprintSimilarity(fingerprint1, fingerprint2);
            })
            .filter(s => s > 0);
          
          if (similarities.length > 0) {
            candidate.fingerprintSimilarity = similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
          }
        }
        
        break;
      }
    }
    
    return candidate;
  });
  
  // Step 5: Select primary (highest score, prefer non-clone if scores are close)
  let primary: CandidateMatch;
  if (candidateMatches.length > 0) {
    // Sort by score, but prefer non-clone if within 5% of top score
    const topScore = candidateMatches[0].overallScore;
    const nonClones = candidateMatches.filter(c => !c.isClone && c.overallScore >= topScore - 0.05);
    
    if (nonClones.length > 0) {
      primary = nonClones[0];
    } else {
      primary = candidateMatches[0];
    }
  } else {
    // Fallback
    primary = {
      strainName: "Closest Known Cultivar",
      overallScore: 0,
      channelScores: { visual: 0, genetics: 0, terpenes: 0, effects: 0 },
      confidence: 0,
      explanation: ["No matches found"],
    };
  }
  
  // Step 6: Select alternates (top 5-10, excluding primary)
  const alternates = candidateMatches
    .filter(c => c.strainName !== primary.strainName)
    .slice(0, 10); // Top 10 alternates
  
  // Step 7: Preserve runner-ups (close but not selected, top 25-50)
  const rejectedButClose = matches
    .slice(topK, topK * 2) // Next 25 matches
    .filter(match => 
      match.overallScore >= 0.5 && // At least 50% match
      match.strainName !== primary.strainName &&
      !alternates.some(a => a.strainName === match.strainName)
    )
    .map(match => ({
      strainName: match.strainName,
      overallScore: match.overallScore,
      channelScores: match.channelScores,
      confidence: match.confidence,
      explanation: match.explanation,
    }))
    .slice(0, 10); // Top 10 runner-ups
  
  return {
    primary,
    alternates,
    rejectedButClose,
  };
}

/**
 * Phase 5.0.4 — Format Candidate Set for Display
 * 
 * Formats the candidate set with explanations and grouping info.
 */
export function formatCandidateSet(candidateSet: CandidateSet): {
  primary: {
    name: string;
    score: number;
    confidence: number;
    explanation: string[];
    groupInfo?: {
      isClone: boolean;
      groupMembers: string[];
      similarity: number;
    };
  };
  alternates: Array<{
    name: string;
    score: number;
    confidence: number;
    whyNotPrimary: string;
  }>;
  rejectedButClose: Array<{
    name: string;
    score: number;
    whyRejected: string;
  }>;
} {
  // Format primary
  const primary = {
    name: candidateSet.primary.strainName,
    score: candidateSet.primary.overallScore,
    confidence: candidateSet.primary.confidence,
    explanation: candidateSet.primary.explanation,
    groupInfo: candidateSet.primary.isClone && candidateSet.primary.groupMembers && candidateSet.primary.groupMembers.length > 0
      ? {
          isClone: true,
          groupMembers: candidateSet.primary.groupMembers,
          similarity: candidateSet.primary.fingerprintSimilarity || 0,
        }
      : undefined,
  };
  
  // Format alternates
  const alternates = candidateSet.alternates.map(alt => {
    const topScore = candidateSet.primary.overallScore;
    const scoreDiff = topScore - alt.overallScore;
    
    let whyNotPrimary = "";
    if (alt.isClone && candidateSet.primary.strainName !== alt.strainName) {
      whyNotPrimary = `Clone/pheno variant of ${candidateSet.primary.strainName} (${Math.round(scoreDiff * 100)}% lower score)`;
    } else if (scoreDiff < 0.05) {
      whyNotPrimary = `Very close match (${Math.round(scoreDiff * 100)}% lower score)`;
    } else if (scoreDiff < 0.15) {
      whyNotPrimary = `Close match (${Math.round(scoreDiff * 100)}% lower score)`;
    } else {
      whyNotPrimary = `Lower overall match (${Math.round(scoreDiff * 100)}% lower score)`;
    }
    
    return {
      name: alt.strainName,
      score: alt.overallScore,
      confidence: alt.confidence,
      whyNotPrimary,
    };
  });
  
  // Format rejected but close
  const rejectedButClose = candidateSet.rejectedButClose.map(rejected => {
    const topScore = candidateSet.primary.overallScore;
    const scoreDiff = topScore - rejected.overallScore;
    
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
  
  return {
    primary,
    alternates,
    rejectedButClose,
  };
}
