// lib/scanner/strainShortlist.ts
// Phase 4.1 Step 4.1.1 — Build Strain Shortlist

import type { ImageResult } from "./consensusEngine";
import { CULTIVAR_LIBRARY } from "./cultivarLibrary";

/**
 * Phase 4.3 Step 4.3.2 — Strain Shortlist Entry
 * Unique strain with metadata from per-image analysis
 */
export type StrainShortlist = {
  name: string;
  appearancesAcrossImages: number; // How many images identified this strain
  avgConfidence: number; // Average confidence across appearances
  maxConfidence: number; // Highest confidence from any image
  perImageTraits: Map<number, string[]>; // Traits matched per image (imageIndex → traits)
  imageIndices: number[]; // Which images identified this strain
  canonicalName: string; // Normalized canonical name (Phase 4.3 Step 4.3.2 — Alias normalization)
  totalConfidence?: number; // Temporary for calculation (excluded from final output)
};

/**
 * Phase 4.3 Step 4.3.2 — Normalize Strain Name (Alias Resolution)
 * 
 * FROM EACH IMAGE:
 * - Extract top 5 candidate strain names
 * - Include:
 *   - Exact name matches
 *   - Alias matches
 *   - Phenotype-adjacent names
 * 
 * MERGE across images:
 * - Frequency-weighted ranking
 * - Alias normalization (OG Kush = OGK, etc.)
 * - Penalize single-image-only candidates
 */
function normalizeStrainName(candidateName: string): string {
  // Phase 4.3 Step 4.3.2 — Find canonical name from CULTIVAR_LIBRARY
  const exactMatch = CULTIVAR_LIBRARY.find(s => s.name === candidateName);
  if (exactMatch) return exactMatch.name;

  // Phase 4.3 Step 4.3.2 — Check aliases
  const aliasMatch = CULTIVAR_LIBRARY.find(s => 
    s.aliases?.some(alias => 
      alias.toLowerCase() === candidateName.toLowerCase() ||
      alias.toLowerCase().replace(/\s+/g, "") === candidateName.toLowerCase().replace(/\s+/g, "")
    )
  );
  if (aliasMatch) return aliasMatch.name;

  // Phase 4.3 Step 4.3.2 — Try fuzzy matching for common aliases
  const normalized = candidateName.toLowerCase().replace(/\s+/g, "");
  const fuzzyMatch = CULTIVAR_LIBRARY.find(s => {
    const sName = s.name.toLowerCase().replace(/\s+/g, "");
    const sAliases = s.aliases?.map(a => a.toLowerCase().replace(/\s+/g, "")) || [];
    return sName === normalized || sAliases.includes(normalized);
  });
  if (fuzzyMatch) return fuzzyMatch.name;

  // Phase 4.3 Step 4.3.2 — Return original if no match found
  return candidateName;
}

/**
 * Phase 4.3 Step 4.3.2 — Build Strain Shortlist
 * 
 * INPUT: Per-image analysis results (top 5 candidates per image)
 * ACTION: Merge candidates into UNIQUE strain name shortlist
 * OUTPUT: StrainShortlist[] (max ~10 strains)
 * 
 * Keep metadata:
 * - appearancesAcrossImages (count)
 * - avgConfidence
 * - maxConfidence
 * - perImageTraits
 */
export function buildStrainShortlist(
  imageResults: ImageResult[]
): StrainShortlist[] {
  // Phase 4.3 Step 4.3.2 — Aggregate candidates across all images (with alias normalization)
  const strainMap = new Map<string, StrainShortlist>();

  imageResults.forEach((result, imageIndex) => {
    // Process top 5 candidates per image (Phase 4.3 Step 4.3.2)
    result.candidateStrains.slice(0, 5).forEach(candidate => {
      // Phase 4.3 Step 4.3.2 — Normalize name (alias resolution)
      const canonicalName = normalizeStrainName(candidate.name);
      
      // Phase 4.3 Step 4.3.2 — Use canonical name as key, but preserve original name in display
      let existing = strainMap.get(canonicalName);

      if (existing) {
        // Update existing entry
        existing.appearancesAcrossImages++;
        existing.totalConfidence! += candidate.confidence;
        existing.maxConfidence = Math.max(existing.maxConfidence, candidate.confidence);
        existing.perImageTraits.set(imageIndex, candidate.traitsMatched);
        existing.imageIndices.push(imageIndex);
        strainMap.set(canonicalName, existing);
      } else {
        // Create new entry
        const perImageTraits = new Map<number, string[]>();
        perImageTraits.set(imageIndex, candidate.traitsMatched);
        
        strainMap.set(canonicalName, {
          name: candidate.name, // Keep original for display
          canonicalName, // Store normalized name
          appearancesAcrossImages: 1,
          avgConfidence: candidate.confidence, // Will be updated
          totalConfidence: candidate.confidence, // Temporary for calculation
          maxConfidence: candidate.confidence,
          perImageTraits,
          imageIndices: [imageIndex],
        });
      }
    });
  });

  // Phase 4.1 Step 4.1.1 — Convert to array and calculate avgConfidence
  const shortlist: StrainShortlist[] = Array.from(strainMap.values()).map(entry => {
    const avgConfidence = entry.totalConfidence / entry.appearancesAcrossImages;
    const { totalConfidence: _totalConfidence, ...rest } = entry;
    return {
      ...rest,
      avgConfidence,
    };
  });

  // Phase 4.1 Step 4.1.1 — Sort by appearances (desc) then avgConfidence (desc)
  shortlist.sort((a, b) => {
    if (b.appearancesAcrossImages !== a.appearancesAcrossImages) {
      return b.appearancesAcrossImages - a.appearancesAcrossImages;
    }
    return b.avgConfidence - a.avgConfidence;
  });

  // Phase 4.1 Step 4.1.1 — Return max ~10 strains
  return shortlist.slice(0, 10);
}
