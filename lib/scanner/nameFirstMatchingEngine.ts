// Phase B.1 — NAME-FIRST MATCHING ENGINE
// lib/scanner/nameFirstMatchingEngine.ts

// Database first. Always.
// No image data, no terpene data, no ratios.

import { getCultivarLibrarySync, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase B.1 — Strain Index Entry
 * 
 * Pre-computed index for fast matching
 */
type StrainIndexEntry = {
  strain: CultivarReference;
  normalizedName: string;
  normalizedTokens: Set<string>;
  normalizedAliases: string[];
  normalizedAliasTokens: Set<string>;
  parentNames: string[]; // Extracted from lineage
  soundexCode: string;
  metaphoneCode: string;
};

/**
 * Phase B.1 — Name Match Candidate
 * 
 * Top 5 candidates with scores and reason tags
 */
export type NameMatchCandidate = {
  strainName: string;
  score: number; // 0-100
  reasonTags: string[]; // ["exact", "alias", "token", "phonetic", "lineage"]
};

/**
 * Phase B.1 — Name-First Matching Result
 */
export type NameFirstMatchingResult = {
  candidates: NameMatchCandidate[]; // Top 5, sorted by score
  primaryStrainName: string; // Selected from candidates[0]
  confidence: number; // 0-100
  explanation: string[]; // Why this name was selected
};

/**
 * Phase B.1 — Normalize string to tokens
 * 
 * Converts "OG Kush" → ["og", "kush"]
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ") // Replace non-alphanumeric with space
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Phase B.1 — Soundex algorithm for phonetic matching
 * 
 * Returns 4-character code (e.g., "K200" for "Kush")
 */
function soundex(str: string): string {
  const s = str.toUpperCase().trim();
  if (!s) return "";
  
  // Step 1: Keep first letter
  let code = s[0];
  
  // Step 2: Replace consonants with digits
  const mapping: { [key: string]: string } = {
    "B": "1", "F": "1", "P": "1", "V": "1",
    "C": "2", "G": "2", "J": "2", "K": "2", "Q": "2", "S": "2", "X": "2", "Z": "2",
    "D": "3", "T": "3",
    "L": "4",
    "M": "5", "N": "5",
    "R": "6",
  };
  
  // Step 3: Replace letters
  for (let i = 1; i < s.length; i++) {
    const char = s[i];
    if (mapping[char]) {
      code += mapping[char];
    }
  }
  
  // Step 4: Remove consecutive duplicates
  let result = code[0];
  for (let i = 1; i < code.length; i++) {
    if (code[i] !== code[i - 1]) {
      result += code[i];
    }
  }
  
  // Step 5: Pad to 4 characters
  return (result + "0000").substring(0, 4);
}

/**
 * Phase B.1 — Metaphone algorithm for phonetic matching
 * 
 * Simplified version - returns phonetic code
 */
function metaphone(str: string): string {
  let s = str.toUpperCase().trim();
  if (!s) return "";
  
  // Remove non-letters
  s = s.replace(/[^A-Z]/g, "");
  
  // Common transformations
  s = s.replace(/^KN|^GN|^PN|^AE|^WR/, "");
  s = s.replace(/PH/g, "F");
  s = s.replace(/^X/, "S");
  s = s.replace(/X/g, "KS");
  s = s.replace(/^WH/, "W");
  s = s.replace(/CK/g, "K");
  s = s.replace(/C([EIY])/g, "S$1");
  s = s.replace(/C/g, "K");
  s = s.replace(/DGE|DGI|DGY/g, "J");
  s = s.replace(/D/g, "T");
  s = s.replace(/GH(?!$)/g, "");
  s = s.replace(/GN(?!$)/g, "N");
  s = s.replace(/G([EIY])/g, "J$1");
  s = s.replace(/G/g, "K");
  s = s.replace(/^H/, "");
  s = s.replace(/([^CSPT])H/g, "$1");
  s = s.replace(/J/g, "J");
  s = s.replace(/Q/g, "K");
  s = s.replace(/S([HIOUY])/g, "X$1");
  s = s.replace(/T([IOUY])/g, "X$1");
  s = s.replace(/V/g, "F");
  s = s.replace(/W([^AEIOUY])/g, "$1");
  s = s.replace(/Y([^AEIOUY])/g, "$1");
  s = s.replace(/Z/g, "S");
  s = s.replace(/(.)\1+/g, "$1"); // Remove duplicates
  
  return s.substring(0, 4);
}

/**
 * Phase B.1 — Extract parent names from lineage
 * 
 * "Blueberry × Haze" → ["blueberry", "haze"]
 */
function extractParentNames(genetics: string): string[] {
  if (!genetics || genetics === "Unknown") return [];
  
  return genetics
    .split(/[×x]/)
    .map(p => p.trim().toLowerCase())
    .filter(p => p.length > 0);
}

/**
 * Phase B.1 — Build strain index from database
 * 
 * Creates pre-computed index for fast matching
 */
let strainIndexCache: StrainIndexEntry[] | null = null;

function buildStrainIndex(): StrainIndexEntry[] {
  if (strainIndexCache) {
    return strainIndexCache;
  }
  
  const library = getCultivarLibrarySync();
  const index: StrainIndexEntry[] = [];
  
  for (const strain of library) {
    const normalizedName = strain.name.toLowerCase().trim();
    const normalizedTokens = new Set(tokenize(strain.name));
    
    // Normalize aliases
    const normalizedAliases = (strain.aliases || []).map(a => a.toLowerCase().trim());
    const normalizedAliasTokens = new Set<string>();
    for (const alias of normalizedAliases) {
      for (const token of tokenize(alias)) {
        normalizedAliasTokens.add(token);
      }
    }
    
    // Extract parent names from lineage
    const parentNames = extractParentNames(strain.genetics || "");
    
    // Generate phonetic codes
    const soundexCode = soundex(strain.name);
    const metaphoneCode = metaphone(strain.name);
    
    index.push({
      strain,
      normalizedName,
      normalizedTokens,
      normalizedAliases,
      normalizedAliasTokens,
      parentNames,
      soundexCode,
      metaphoneCode,
    });
  }
  
  strainIndexCache = index;
  console.log(`Phase B.1 — Strain index built: ${index.length} strains`);
  return index;
}

/**
 * Phase B.1 — Jaccard similarity (token overlap)
 * 
 * Returns similarity score 0-1
 */
function jaccardSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;
  
  let intersection = 0;
  let union = tokens2.size;
  
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++;
    } else {
      union++;
    }
  }
  
  return intersection / union;
}

/**
 * Phase B.1 — Match Name Against Database
 * 
 * Database first. Always.
 * No image data, no terpene data, no ratios.
 * 
 * Pipeline:
 * 1. Exact match
 * 2. Alias match
 * 3. Token similarity (Jaccard)
 * 4. Phonetic match (Soundex / Metaphone)
 * 5. Lineage proximity boost
 * 
 * Returns TOP 5 candidates with scores and reasonTags
 */
export function matchNameAgainstDatabase(
  candidateName: string
): NameMatchCandidate[] {
  const index = buildStrainIndex();
  const candidateLower = candidateName.toLowerCase().trim();
  const candidateTokens = new Set(tokenize(candidateName));
  const candidateSoundex = soundex(candidateName);
  const candidateMetaphone = metaphone(candidateName);
  
  const scoredCandidates: Map<string, { score: number; reasonTags: Set<string> }> = new Map();
  
  for (const entry of index) {
    let score = 0;
    const reasonTags = new Set<string>();
    
    // 1. EXACT NAME MATCH (100 points)
    if (entry.normalizedName === candidateLower) {
      score = 100;
      reasonTags.add("exact");
      scoredCandidates.set(entry.strain.name, { score, reasonTags });
      continue; // Exact match is highest priority
    }
    
    // 2. ALIAS MATCH (90 points)
    if (entry.normalizedAliases.includes(candidateLower)) {
      score = Math.max(score, 90);
      reasonTags.add("alias");
    }
    
    // 3. TOKEN SIMILARITY (Jaccard) (0-85 points)
    const nameTokenSimilarity = jaccardSimilarity(candidateTokens, entry.normalizedTokens);
    if (nameTokenSimilarity > 0.3) { // Only consider if > 30% similar
      const tokenScore = Math.round(nameTokenSimilarity * 85);
      if (tokenScore > score) {
        score = tokenScore;
      }
      reasonTags.add("token");
    }
    
    // Check alias token similarity too
    const aliasTokenSimilarity = jaccardSimilarity(candidateTokens, entry.normalizedAliasTokens);
    if (aliasTokenSimilarity > 0.3) {
      const aliasTokenScore = Math.round(aliasTokenSimilarity * 80);
      if (aliasTokenScore > score) {
        score = aliasTokenScore;
      }
      if (!reasonTags.has("alias")) {
        reasonTags.add("token");
      }
    }
    
    // 4. PHONETIC MATCH (Soundex / Metaphone) (0-75 points)
    if (entry.soundexCode === candidateSoundex && candidateSoundex.length > 0) {
      const phoneticScore = 75;
      if (phoneticScore > score) {
        score = phoneticScore;
      }
      reasonTags.add("phonetic");
    } else if (entry.metaphoneCode === candidateMetaphone && candidateMetaphone.length > 0) {
      const phoneticScore = 70;
      if (phoneticScore > score) {
        score = phoneticScore;
      }
      reasonTags.add("phonetic");
    }
    
    // 5. LINEAGE PROXIMITY BOOST (0-65 points + boost)
    if (entry.parentNames.length > 0) {
      let lineageScore = 0;
      for (const parent of entry.parentNames) {
        const parentTokens = new Set(tokenize(parent));
        const parentSimilarity = jaccardSimilarity(candidateTokens, parentTokens);
        if (parentSimilarity > 0.4) {
          lineageScore = Math.max(lineageScore, Math.round(parentSimilarity * 65));
        }
      }
      
      if (lineageScore > 0) {
        // Boost if we already have other matches
        if (reasonTags.size > 0) {
          lineageScore = Math.min(100, lineageScore + 10); // +10 boost
        }
        if (lineageScore > score) {
          score = lineageScore;
        }
        reasonTags.add("lineage");
      }
    }
    
    // Only add if score > 0 and we have at least one reason tag
    if (score > 0 && reasonTags.size > 0) {
      const existing = scoredCandidates.get(entry.strain.name);
      if (!existing || score > existing.score) {
        scoredCandidates.set(entry.strain.name, { score, reasonTags });
      }
    }
  }
  
  // Convert to array, sort by score, return top 5
  const candidates: NameMatchCandidate[] = Array.from(scoredCandidates.entries())
    .map(([strainName, { score, reasonTags }]) => ({
      strainName,
      score,
      reasonTags: Array.from(reasonTags),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  return candidates;
}

/**
 * Phase B.1 — Name-First Matching Engine
 * 
 * Database first. Always.
 * No image data, no terpene data, no ratios.
 * 
 * Takes candidate names and returns top 5 matches with scores and reasonTags.
 * Selects primaryStrainName from this list ONLY.
 */
export function nameFirstMatchingEngine(
  candidateNames: string[] // Candidate names from images/consensus
): NameFirstMatchingResult {
  // Collect all matches across all candidate names
  const allMatches = new Map<string, NameMatchCandidate>();
  
  for (const candidateName of candidateNames) {
    if (!candidateName || candidateName.trim().length < 2) continue;
    
    const matches = matchNameAgainstDatabase(candidateName);
    
    // Merge matches, keeping highest score for each strain
    for (const match of matches) {
      const existing = allMatches.get(match.strainName);
      if (!existing || match.score > existing.score) {
        allMatches.set(match.strainName, match);
      } else if (existing && match.score === existing.score) {
        // Merge reasonTags if scores are equal
        const mergedTags = new Set([...existing.reasonTags, ...match.reasonTags]);
        allMatches.set(match.strainName, {
          ...existing,
          reasonTags: Array.from(mergedTags),
        });
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
    primaryStrainName = candidates[0].strainName;
    confidence = Math.min(99, candidates[0].score);
    
    // Build explanation from reasonTags
    const tags = candidates[0].reasonTags;
    if (tags.includes("exact")) {
      explanation.push("Exact database match found");
    } else if (tags.includes("alias")) {
      explanation.push("Matched via known alias");
    } else if (tags.includes("token")) {
      explanation.push("Token similarity match");
    } else if (tags.includes("phonetic")) {
      explanation.push("Phonetic similarity match");
    } else if (tags.includes("lineage")) {
      explanation.push("Lineage proximity match");
    }
    
    if (tags.length > 1) {
      explanation.push(`Matched using: ${tags.join(", ")}`);
    }
  } else if (candidates.length > 0) {
    // Use top candidate even if score < 60, but reduce confidence
    primaryStrainName = candidates[0].strainName;
    confidence = Math.max(55, candidates[0].score);
    explanation.push(`Low confidence match — database suggests this strain`);
    if (candidates[0].reasonTags.length > 0) {
      explanation.push(`Matched using: ${candidates[0].reasonTags.join(", ")}`);
    }
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
