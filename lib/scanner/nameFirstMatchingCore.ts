// Phase B.1 — NAME-FIRST MATCHING CORE
// lib/scanner/nameFirstMatchingCore.ts

// Database first. Always.
// No vision logic yet.

import { getCultivarLibrarySync, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase B.1 — Name Match Candidate
 * 
 * Top 5 candidates with scores from database matching only.
 */
export type NameMatchCandidate = {
  strain: CultivarReference;
  score: number; // 0-100
  matchType: "exact" | "alias" | "phonetic" | "lineage";
  matchDetails: string; // Explanation of match
};

/**
 * Phase B.1 — Name-First Matching Result
 * 
 * Returns top 5 candidates with scores.
 * Primary strain name selected from this list ONLY.
 */
export type NameFirstMatchingResult = {
  candidates: NameMatchCandidate[]; // Top 5, sorted by score
  primaryStrainName: string; // Selected from candidates[0]
  confidence: number; // 0-100
  explanation: string[]; // Why this name was selected
};

/**
 * Phase B.1 — Simple phonetic similarity (Levenshtein-based)
 * 
 * Returns similarity score 0-1 (1 = identical, 0 = completely different)
 */
function phoneticSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Simple Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;
  
  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1.0 - (distance / maxLen);
}

/**
 * Phase B.1 — Check lineage proximity
 * 
 * Returns score 0-1 based on how closely the candidate name matches
 * parent strains in the lineage.
 */
function lineageProximityScore(
  candidateName: string,
  strain: CultivarReference
): number {
  if (!strain.genetics) return 0.0;
  
  const candidateLower = candidateName.toLowerCase().trim();
  const genetics = strain.genetics.toLowerCase();
  
  // Check if candidate name appears in genetics/lineage
  if (genetics.includes(candidateLower) || candidateLower.includes(genetics)) {
    return 0.9;
  }
  
  // Check parent strains
  const parents = genetics.split(/[×x]/).map(p => p.trim().toLowerCase());
  let maxParentScore = 0.0;
  
  for (const parent of parents) {
    if (parent.length < 3) continue;
    
    // Check if candidate contains parent name or vice versa
    if (candidateLower.includes(parent) || parent.includes(candidateLower)) {
      maxParentScore = Math.max(maxParentScore, 0.8);
    } else {
      // Check phonetic similarity with parent
      const similarity = phoneticSimilarity(candidateName, parent);
      maxParentScore = Math.max(maxParentScore, similarity * 0.6);
    }
  }
  
  return maxParentScore;
}

/**
 * Phase B.1 — Match Name Against Database
 * 
 * Database first. Always.
 * No vision logic yet.
 * 
 * Uses:
 * 1. Exact name match
 * 2. Alias match
 * 3. Phonetic similarity
 * 4. Lineage proximity
 * 
 * Returns TOP 5 candidates with scores.
 */
export function matchNameAgainstDatabase(
  candidateName: string
): NameMatchCandidate[] {
  const library = getCultivarLibrarySync();
  const normalizedCandidate = candidateName.toLowerCase().trim();
  
  const scoredCandidates: NameMatchCandidate[] = [];
  
  for (const strain of library) {
    let score = 0;
    let matchType: "exact" | "alias" | "phonetic" | "lineage" = "phonetic";
    let matchDetails = "";
    
    const normalizedStrainName = strain.name.toLowerCase().trim();
    
    // 1. EXACT NAME MATCH (100 points)
    if (normalizedStrainName === normalizedCandidate) {
      score = 100;
      matchType = "exact";
      matchDetails = `Exact name match: "${strain.name}"`;
      scoredCandidates.push({ strain, score, matchType, matchDetails });
      continue; // Exact match is highest priority, add and continue
    }
    
    // 2. ALIAS MATCH (90 points)
    if (strain.aliases && strain.aliases.length > 0) {
      const aliasMatch = strain.aliases.some(alias => 
        alias.toLowerCase().trim() === normalizedCandidate
      );
      if (aliasMatch) {
        score = 90;
        matchType = "alias";
        matchDetails = `Alias match: "${candidateName}" → "${strain.name}"`;
        scoredCandidates.push({ strain, score, matchType, matchDetails });
        continue; // Alias match is high priority, add and continue
      }
    }
    
    // 3. PHONETIC SIMILARITY (0-80 points)
    const phoneticScore = phoneticSimilarity(candidateName, strain.name);
    if (phoneticScore > 0.6) { // Only consider if > 60% similar
      score = Math.round(phoneticScore * 80);
      matchType = "phonetic";
      matchDetails = `Phonetic similarity: ${Math.round(phoneticScore * 100)}% similar to "${strain.name}"`;
      scoredCandidates.push({ strain, score, matchType, matchDetails });
      continue;
    }
    
    // 4. LINEAGE PROXIMITY (0-70 points)
    const lineageScore = lineageProximityScore(candidateName, strain);
    if (lineageScore > 0.5) { // Only consider if > 50% proximity
      score = Math.round(lineageScore * 70);
      matchType = "lineage";
      matchDetails = `Lineage proximity: candidate matches genetics of "${strain.name}"`;
      scoredCandidates.push({ strain, score, matchType, matchDetails });
    }
  }
  
  // Sort by score (descending) and return top 5
  scoredCandidates.sort((a, b) => b.score - a.score);
  return scoredCandidates.slice(0, 5);
}

/**
 * Phase B.1 — Name-First Matching Core
 * 
 * Database first. Always.
 * No vision logic yet.
 * 
 * Takes candidate names and returns top 5 matches with scores.
 * Selects primaryStrainName from this list ONLY.
 */
export function nameFirstMatchingCore(
  candidateNames: string[] // Candidate names from images/consensus
): NameFirstMatchingResult {
  // Collect all matches across all candidate names
  const allMatches = new Map<string, NameMatchCandidate>();
  
  for (const candidateName of candidateNames) {
    if (!candidateName || candidateName.trim().length < 2) continue;
    
    const matches = matchNameAgainstDatabase(candidateName);
    
    // Merge matches, keeping highest score for each strain
    for (const match of matches) {
      const existing = allMatches.get(match.strain.name);
      if (!existing || match.score > existing.score) {
        allMatches.set(match.strain.name, match);
      }
    }
  }
  
  // Convert to array and sort by score
  const candidates = Array.from(allMatches.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5
  
  // Select primaryStrainName from candidates[0] ONLY
  let primaryStrainName = "Closest Known Cultivar";
  let confidence = 70;
  const explanation: string[] = [];
  
  if (candidates.length > 0 && candidates[0].score >= 60) {
    primaryStrainName = candidates[0].strain.name;
    confidence = Math.min(99, candidates[0].score);
    
    explanation.push(candidates[0].matchDetails);
    if (candidates[0].matchType === "exact") {
      explanation.push("Exact database match found");
    } else if (candidates[0].matchType === "alias") {
      explanation.push("Matched via known alias");
    } else if (candidates[0].matchType === "phonetic") {
      explanation.push("Phonetic similarity match");
    } else if (candidates[0].matchType === "lineage") {
      explanation.push("Lineage proximity match");
    }
  } else if (candidates.length > 0) {
    // Use top candidate even if score < 60, but reduce confidence
    primaryStrainName = candidates[0].strain.name;
    confidence = Math.max(55, candidates[0].score);
    explanation.push(candidates[0].matchDetails);
    explanation.push("Low confidence match — database suggests this strain");
  } else {
    // No matches found
    explanation.push("No database matches found for candidate names");
    explanation.push("Using fallback: Closest Known Cultivar");
  }
  
  return {
    candidates,
    primaryStrainName,
    confidence,
    explanation,
  };
}
