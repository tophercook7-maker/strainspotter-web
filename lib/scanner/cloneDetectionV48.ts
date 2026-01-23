// Phase 4.8 — Clone Detection & Enhanced Disambiguation
// lib/scanner/cloneDetectionV48.ts

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";
import { getStrainFamily, type StrainFamily } from "./strainFamilyMap";
import type { FusedFeatures } from "./multiImageFusion";

/**
 * Phase 4.8 — Clone Variant
 * Represents a single variant within a clone group
 */
export type CloneVariant = {
  name: string; // Original variant name (e.g., "OG Kush #1")
  canonicalName: string; // Canonical name (e.g., "OG Kush")
  rootName: string; // Normalized root name (e.g., "og kush")
  confidence: number; // 0-100, how confident this is the same clone
  evidence: string[]; // Why this is considered a clone
  dbEntry?: CultivarReference; // Database entry if found
};

/**
 * Phase 4.8.2 — Clone Group
 * Groups candidates that likely refer to the same cultivar/clone
 */
export type CloneGroup = {
  cloneGroupId: string; // Unique identifier for this clone group (e.g., "og-kush")
  rootName: string; // Normalized root name (e.g., "og kush")
  canonicalName: string; // Best canonical name from database (e.g., "OG Kush")
  variants: CloneVariant[]; // All variants in this group
  cloneConfidence: number; // 0-1, overall confidence this is a clone group
  similarityScores: {
    rootNameMatch: number; // 0-1, how well root names match
    lineageSimilarity: number; // 0-1, genetic lineage overlap
    visualMorphologyOverlap: number; // 0-1, visual trait overlap
    terpeneOverlap: number; // 0-1, terpene profile overlap
  };
  evidence: string[]; // Overall evidence for clone grouping
};

/**
 * Phase 4.8 — Clone Detection Result
 * Detects when different names likely refer to the same cultivar/clone
 */
export type CloneDetectionResult = {
  isClone: boolean; // True if multiple names likely refer to same clone
  primaryName: string; // Best canonical name
  detectedClones: CloneVariant[];
  cloneGroup: CloneGroup | null;
};

/**
 * Phase 4.8 — Clone Detection Patterns
 * Patterns that indicate a name is a clone/variant of another
 */
const CLONE_PATTERNS = [
  // Numbered variants: "OG Kush #1", "Blue Dream #2"
  /^(.+?)\s*#\d+$/i,
  // Phenotype markers: "OG Kush Pheno 1", "Blue Dream Cut"
  /^(.+?)\s+(?:Pheno|Cut|Clone|P\d+|V\d+)/i,
  // Location markers: "OG Kush SFV", "Blue Dream Santa Cruz"
  /^(.+?)\s+(?:SFV|LA|SD|SC|Santa Cruz|Los Angeles|San Diego)/i,
  // Breeder markers: "OG Kush (Reservoir)", "Blue Dream (Humboldt)"
  /^(.+?)\s*\([^)]+\)$/i,
];

/**
 * Phase 4.8.1 — Root Name Normalization (LOCK)
 * Normalizes candidate names by stripping clone markers, breeder/location tags, and normalizing case
 * 
 * Rules:
 * - Strip clone markers: #1, #2, Pheno, Cut, Clone
 * - Strip breeder/location tags: (SFV), (NorCal), [Archive]
 * - Lowercase + trim
 * 
 * Example: "OG Kush #1 (SFV Cut)" → "og kush"
 */
export function normalizeRootName(name: string): string {
  if (!name || typeof name !== "string") {
    return "";
  }
  
  let normalized = name.trim();
  
  // Phase 4.8.1 — Remove square brackets and contents: [Archive], [Seed Co], etc.
  normalized = normalized.replace(/\[[^\]]+\]/g, "").trim();
  
  // Phase 4.8.1 — Remove parentheses and contents: (SFV), (NorCal), (Reservoir), etc.
  normalized = normalized.replace(/\([^)]+\)/g, "").trim();
  
  // Phase 4.8.1 — Remove clone markers with numbers: #1, #2, #3, etc.
  normalized = normalized.replace(/\s*#\d+(\s|$)/gi, " ").trim();
  
  // Phase 4.8.1 — Remove phenotype markers: Pheno 1, Pheno 2, P1, P2, V1, V2, etc.
  normalized = normalized.replace(/\s+(?:Pheno\s*\d*|P\d+|V\d+)(\s|$)/gi, " ").trim();
  
  // Phase 4.8.1 — Remove clone/cut markers: Cut, Clone, Pheno (without number)
  normalized = normalized.replace(/\s+(?:Cut|Clone|Pheno)(\s|$)/gi, " ").trim();
  
  // Phase 4.8.1 — Remove location markers: SFV, LA, SD, SC, NorCal, SoCal, etc.
  const locationMarkers = [
    /\s+SFV(\s|$)/gi,
    /\s+LA(\s|$)/gi,
    /\s+SD(\s|$)/gi,
    /\s+SC(\s|$)/gi,
    /\s+NorCal(\s|$)/gi,
    /\s+SoCal(\s|$)/gi,
    /\s+Santa\s+Cruz(\s|$)/gi,
    /\s+Los\s+Angeles(\s|$)/gi,
    /\s+San\s+Diego(\s|$)/gi,
    /\s+Humboldt(\s|$)/gi,
    /\s+Emerald\s+Triangle(\s|$)/gi,
  ];
  
  for (const marker of locationMarkers) {
    normalized = normalized.replace(marker, " ").trim();
  }
  
  // Phase 4.8.1 — Remove breeder markers: (Reservoir), (Archive), etc. (already handled by parentheses removal, but check for standalone)
  const breederMarkers = [
    /\s+Reservoir(\s|$)/gi,
    /\s+Archive(\s|$)/gi,
    /\s+Seed\s+Co(\s|$)/gi,
  ];
  
  for (const marker of breederMarkers) {
    normalized = normalized.replace(marker, " ").trim();
  }
  
  // Phase 4.8.1 — Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Phase 4.8.1 — Lowercase + trim
  normalized = normalized.toLowerCase().trim();
  
  return normalized;
}

/**
 * Phase 4.8 — Extract Root Name from Clone Pattern (Legacy - uses normalizeRootName)
 * Removes clone indicators to get base strain name
 */
function extractRootFromClone(name: string): string {
  return normalizeRootName(name);
}

/**
 * Phase 4.8.2 — Clone Grouping Engine
 * Groups candidates by root name, lineage similarity, visual morphology, and terpene overlap
 * 
 * Output:
 * - cloneGroupId: Unique identifier for the group
 * - variants[]: All variants in the group
 * - cloneConfidence: 0-1 overall confidence this is a clone group
 */
export function groupClones(
  candidateNames: Array<{ name: string; confidence: number }>,
  fusedFeatures?: FusedFeatures,
  terpeneProfile?: string[] | Array<{ name: string; likelihood?: string }>
): CloneGroup[] {
  if (candidateNames.length < 2) {
    return [];
  }
  
  // Phase 4.8.2 — Group candidates by normalized root name
  const rootGroups = new Map<string, Array<{ name: string; confidence: number; rootName: string }>>();
  
  candidateNames.forEach(candidate => {
    const rootName = normalizeRootName(candidate.name);
    if (!rootName) return; // Skip empty root names
    
    const group = rootGroups.get(rootName) || [];
    group.push({ ...candidate, rootName });
    rootGroups.set(rootName, group);
  });
  
  // Phase 4.8.2 — Build clone groups from root groups with multiple variants
  const cloneGroups: CloneGroup[] = [];
  
  rootGroups.forEach((variants, rootName) => {
    if (variants.length < 2) {
      return; // Skip single-variant groups (not clones)
    }
    
    // Phase 4.8.2 — Find canonical name in database
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      normalizeRootName(s.name) === rootName ||
      s.aliases?.some(a => normalizeRootName(a) === rootName)
    );
    
    const canonicalName = dbEntry?.name || variants[0].name;
    const cloneGroupId = rootName.replace(/\s+/g, "-").toLowerCase();
    
    // Phase 4.8.2 — Calculate similarity scores
    const rootNameMatch = 1.0; // Perfect match (they share root name)
    const lineageSimilarity = calculateLineageSimilarity(variants, dbEntry);
    const visualMorphologyOverlap = calculateVisualMorphologyOverlap(variants, fusedFeatures, dbEntry);
    const terpeneOverlap = calculateTerpeneOverlap(variants, terpeneProfile, dbEntry);
    
    // Phase 4.8.2 — Calculate overall clone confidence (weighted average)
    const cloneConfidence = (
      rootNameMatch * 0.3 + // Root name match is strong indicator
      lineageSimilarity * 0.3 + // Lineage similarity is important
      visualMorphologyOverlap * 0.25 + // Visual overlap supports clone relationship
      terpeneOverlap * 0.15 // Terpene overlap is supporting evidence
    );
    
    // Phase 4.8.2 — Build variants list
    const cloneVariants: CloneVariant[] = variants.map(variant => {
      const variantDbEntry = CULTIVAR_LIBRARY.find(s => 
        normalizeRootName(s.name) === normalizeRootName(variant.name) ||
        s.aliases?.some(a => normalizeRootName(a) === normalizeRootName(variant.name))
      );
      
      const evidence: string[] = [];
      evidence.push(`Root name match: "${rootName}"`);
      
      if (variantDbEntry && dbEntry) {
        // Check genetic similarity
        if (variantDbEntry.genetics && dbEntry.genetics) {
          const variantParents = variantDbEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
          const canonicalParents = dbEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
          const commonParents = variantParents.filter(p => canonicalParents.some(cp => cp.includes(p) || p.includes(cp)));
          if (commonParents.length > 0) {
            evidence.push(`Shared genetic lineage: ${commonParents.join(", ")}`);
          }
        }
        
        // Check type similarity
        if (variantDbEntry.type === dbEntry.type) {
          evidence.push(`Same genetic type: ${dbEntry.type}`);
        }
      }
      
      // Clone pattern match
      const clonePattern = CLONE_PATTERNS.find(pattern => pattern.test(variant.name));
      if (clonePattern) {
        evidence.push(`Clone pattern detected: ${variant.name.match(clonePattern)?.[0] || ""}`);
      }
      
      return {
        name: variant.name,
        canonicalName,
        rootName,
        confidence: Math.min(95, variant.confidence + (lineageSimilarity > 0.7 ? 10 : 0)),
        evidence,
        dbEntry: variantDbEntry,
      };
    });
    
    // Phase 4.8.2 — Build evidence list
    const evidence: string[] = [];
    evidence.push(`${variants.length} variants share root name "${rootName}"`);
    
    if (lineageSimilarity > 0.7) {
      evidence.push(`Strong genetic lineage similarity (${Math.round(lineageSimilarity * 100)}%)`);
    }
    
    if (visualMorphologyOverlap > 0.7) {
      evidence.push(`High visual morphology overlap (${Math.round(visualMorphologyOverlap * 100)}%)`);
    }
    
    if (terpeneOverlap > 0.6) {
      evidence.push(`Terpene profile overlap (${Math.round(terpeneOverlap * 100)}%)`);
    }
    
    cloneGroups.push({
      cloneGroupId,
      rootName,
      canonicalName,
      variants: cloneVariants,
      cloneConfidence,
      similarityScores: {
        rootNameMatch,
        lineageSimilarity,
        visualMorphologyOverlap,
        terpeneOverlap,
      },
      evidence,
    });
  });
  
  // Phase 4.8.2 — Sort by clone confidence (highest first)
  cloneGroups.sort((a, b) => b.cloneConfidence - a.cloneConfidence);
  
  return cloneGroups;
}

/**
 * Phase 4.8 — Detect Clone Relationships (Legacy - uses groupClones)
 * Determines if multiple names refer to the same cultivar/clone
 */
export function detectCloneRelationships(
  candidateNames: Array<{ name: string; confidence: number }>,
  fusedFeatures?: FusedFeatures
): CloneDetectionResult {
  if (candidateNames.length < 2) {
    return {
      isClone: false,
      primaryName: candidateNames[0]?.name || "Unknown",
      detectedClones: [],
      cloneGroup: null,
    };
  }
  
  // Phase 4.8 — Group candidates by root name
  const rootGroups = new Map<string, Array<{ name: string; confidence: number; rootName: string }>>();
  
  candidateNames.forEach(candidate => {
    const rootName = extractRootFromClone(candidate.name);
    const group = rootGroups.get(rootName) || [];
    group.push({ ...candidate, rootName });
    rootGroups.set(rootName, group);
  });
  
  // Phase 4.8 — Find groups with multiple variants (potential clones)
  const cloneGroups: Array<{
    rootName: string;
    variants: Array<{ name: string; confidence: number }>;
  }> = [];
  
  rootGroups.forEach((variants, rootName) => {
    if (variants.length > 1) {
      cloneGroups.push({ rootName, variants });
    }
  });
  
  if (cloneGroups.length === 0) {
    // No clone groups detected
    const topCandidate = candidateNames[0];
    return {
      isClone: false,
      primaryName: topCandidate.name,
      detectedClones: [],
      cloneGroup: null,
    };
  }
  
  // Phase 4.8 — Select best clone group (highest total confidence)
  const bestGroup = cloneGroups.reduce((best, current) => {
    const currentTotal = current.variants.reduce((sum, v) => sum + v.confidence, 0);
    const bestTotal = best.variants.reduce((sum, v) => sum + v.confidence, 0);
    return currentTotal > bestTotal ? current : best;
  });
  
  // Phase 4.8 — Find canonical name in database
  const dbEntry = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === bestGroup.rootName.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === bestGroup.rootName.toLowerCase())
  );
  
  const canonicalName = dbEntry?.name || bestGroup.rootName;
  
  // Phase 4.8 — Calculate genetic similarity
  const geneticSimilarity = calculateGeneticSimilarity(bestGroup.variants, dbEntry);
  
  // Phase 4.8 — Calculate visual similarity
  const visualSimilarity = calculateVisualSimilarity(bestGroup.variants, fusedFeatures);
  
  // Phase 4.8 — Build detected clones list
  const detectedClones = bestGroup.variants
    .filter(v => v.name.toLowerCase() !== canonicalName.toLowerCase())
    .map(variant => {
      const variantDbEntry = CULTIVAR_LIBRARY.find(s => 
        s.name.toLowerCase() === variant.name.toLowerCase() ||
        s.aliases?.some(a => a.toLowerCase() === variant.name.toLowerCase())
      );
      
      const evidence: string[] = [];
      evidence.push(`Root name matches: "${bestGroup.rootName}"`);
      
      if (variantDbEntry && dbEntry) {
        // Check genetic similarity
        if (variantDbEntry.genetics && dbEntry.genetics) {
          const variantParents = variantDbEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
          const canonicalParents = dbEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
          const commonParents = variantParents.filter(p => canonicalParents.some(cp => cp.includes(p) || p.includes(cp)));
          if (commonParents.length > 0) {
            evidence.push(`Shared genetic lineage: ${commonParents.join(", ")}`);
          }
        }
        
        // Check type similarity
        if (variantDbEntry.type === dbEntry.type) {
          evidence.push(`Same genetic type: ${dbEntry.type}`);
        }
      }
      
      // Clone pattern match
      const clonePattern = CLONE_PATTERNS.find(pattern => pattern.test(variant.name));
      if (clonePattern) {
        evidence.push(`Clone pattern detected: ${variant.name.match(clonePattern)?.[0] || ""}`);
      }
      
      return {
        name: variant.name,
        canonicalName,
        confidence: Math.min(95, variant.confidence + (lineageSimilarity > 0.7 ? 10 : 0)),
        evidence,
      };
    });
  
  return {
    isClone: true,
    primaryName: canonicalName,
    detectedClones,
    cloneGroup: {
      rootName: bestGroup.rootName,
      allVariants: bestGroup.variants.map(v => v.name),
      geneticSimilarity,
      visualSimilarity,
    },
  };
}

/**
 * Phase 4.8.2 — Calculate Lineage Similarity
 * Compares genetic lineage between variants (returns 0-1)
 */
function calculateLineageSimilarity(
  variants: Array<{ name: string; confidence: number }>,
  canonicalEntry?: CultivarReference
): number {
  if (!canonicalEntry || !canonicalEntry.genetics) {
    return 0.5; // Default if no genetics data
  }
  
  const canonicalParents = canonicalEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
  if (canonicalParents.length === 0) {
    return 0.5;
  }
  
  let totalSimilarity = 0;
  let count = 0;
  
  variants.forEach(variant => {
    const variantEntry = CULTIVAR_LIBRARY.find(s => 
      normalizeRootName(s.name) === normalizeRootName(variant.name) ||
      s.aliases?.some(a => normalizeRootName(a) === normalizeRootName(variant.name))
    );
    
    if (variantEntry && variantEntry.genetics) {
      const variantParents = variantEntry.genetics.split(/[×x/]/).map(p => p.trim().toLowerCase());
      const commonParents = variantParents.filter(p => 
        canonicalParents.some(cp => cp.includes(p) || p.includes(cp))
      );
      
      // Calculate Jaccard similarity (intersection / union)
      const union = new Set([...canonicalParents, ...variantParents]);
      const similarity = commonParents.length / union.size;
      totalSimilarity += similarity;
      count++;
    }
  });
  
  return count > 0 ? totalSimilarity / count : 0.5;
}

/**
 * Phase 4.8.2 — Calculate Visual Morphology Overlap
 * Compares visual features between variants and fused features (returns 0-1)
 */
function calculateVisualMorphologyOverlap(
  variants: Array<{ name: string; confidence: number }>,
  fusedFeatures?: FusedFeatures,
  canonicalEntry?: CultivarReference
): number {
  if (!fusedFeatures) {
    return 0.5; // Default if no visual features
  }
  
  // Get canonical visual profile
  const canonicalVisual = canonicalEntry ? (
    (canonicalEntry as any).visualProfile || {
      budStructure: (canonicalEntry as any).morphology?.budDensity || "medium",
      leafShape: (canonicalEntry as any).morphology?.leafShape || "broad",
      trichomeDensity: (canonicalEntry as any).morphology?.trichomeDensity || "medium",
    }
  ) : null;
  
  if (!canonicalVisual) {
    return 0.5;
  }
  
  let totalOverlap = 0;
  let count = 0;
  
  variants.forEach(variant => {
    const variantEntry = CULTIVAR_LIBRARY.find(s => 
      normalizeRootName(s.name) === normalizeRootName(variant.name) ||
      s.aliases?.some(a => normalizeRootName(a) === normalizeRootName(variant.name))
    );
    
    if (variantEntry) {
      const variantVisual = (variantEntry as any).visualProfile || {
        budStructure: (variantEntry as any).morphology?.budDensity || "medium",
        leafShape: (variantEntry as any).morphology?.leafShape || "broad",
        trichomeDensity: (variantEntry as any).morphology?.trichomeDensity || "medium",
      };
      
      let matches = 0;
      const total = 3;
      
      // Compare with canonical visual profile
      if (canonicalVisual.budStructure === variantVisual.budStructure) matches++;
      if (canonicalVisual.leafShape === variantVisual.leafShape) matches++;
      if (canonicalVisual.trichomeDensity === variantVisual.trichomeDensity) matches++;
      
      // Also compare with fused features (observed traits)
      let fusedMatches = 0;
      if (fusedFeatures.budStructure === variantVisual.budStructure) fusedMatches++;
      if (fusedFeatures.leafShape === variantVisual.leafShape) fusedMatches++;
      if (fusedFeatures.trichomeDensity === variantVisual.trichomeDensity) fusedMatches++;
      
      // Average of canonical comparison and fused features comparison
      const overlap = ((matches + fusedMatches) / (total * 2));
      totalOverlap += overlap;
      count++;
    }
  });
  
  return count > 0 ? totalOverlap / count : 0.5;
}

/**
 * Phase 4.8.2 — Calculate Terpene Overlap
 * Compares terpene profiles between variants (returns 0-1)
 */
function calculateTerpeneOverlap(
  variants: Array<{ name: string; confidence: number }>,
  terpeneProfile?: string[] | Array<{ name: string; likelihood?: string }>,
  canonicalEntry?: CultivarReference
): number {
  if (!terpeneProfile || terpeneProfile.length === 0) {
    return 0.5; // Default if no terpene data
  }
  
  // Extract terpene names from profile
  const profileTerpenes = terpeneProfile.map(t => 
    typeof t === "string" ? t.toLowerCase() : t.name.toLowerCase()
  );
  
  if (profileTerpenes.length === 0) {
    return 0.5;
  }
  
  // Get canonical terpene profile
  const canonicalTerpenes = canonicalEntry ? (
    (canonicalEntry.terpeneProfile || canonicalEntry.commonTerpenes || []).map(t => 
      typeof t === "string" ? t.toLowerCase() : (t as any).name?.toLowerCase() || ""
    )
  ) : [];
  
  let totalOverlap = 0;
  let count = 0;
  
  variants.forEach(variant => {
    const variantEntry = CULTIVAR_LIBRARY.find(s => 
      normalizeRootName(s.name) === normalizeRootName(variant.name) ||
      s.aliases?.some(a => normalizeRootName(a) === normalizeRootName(variant.name))
    );
    
    if (variantEntry) {
      const variantTerpenes = (variantEntry.terpeneProfile || variantEntry.commonTerpenes || []).map(t => 
        typeof t === "string" ? t.toLowerCase() : (t as any).name?.toLowerCase() || ""
      );
      
      // Calculate overlap with canonical terpenes
      const canonicalOverlap = variantTerpenes.filter(t => canonicalTerpenes.includes(t)).length;
      const canonicalUnion = new Set([...canonicalTerpenes, ...variantTerpenes]);
      const canonicalSimilarity = canonicalUnion.size > 0 ? canonicalOverlap / canonicalUnion.size : 0;
      
      // Calculate overlap with observed terpene profile
      const profileOverlap = variantTerpenes.filter(t => profileTerpenes.includes(t)).length;
      const profileUnion = new Set([...profileTerpenes, ...variantTerpenes]);
      const profileSimilarity = profileUnion.size > 0 ? profileOverlap / profileUnion.size : 0;
      
      // Average of canonical and profile similarity
      const overlap = (canonicalSimilarity + profileSimilarity) / 2;
      totalOverlap += overlap;
      count++;
    }
  });
  
  return count > 0 ? totalOverlap / count : 0.5;
}

/**
 * Phase 4.8.3 — Primary Name Selection Result
 * Selected primary name and alternates from clone groups
 */
export type PrimaryNameSelectionResult = {
  primaryStrainName: string; // Best canonical name
  alternateNames: Array<{
    name: string; // Alternate variant name
    canonicalName: string; // Canonical name
    reason: string; // Why this is an alternate
  }>;
  selectionReason: string[]; // Why this name was selected
  cloneGroupId?: string; // Clone group ID if from a clone group
};

/**
 * Phase 4.8.3 — Primary Name Selection
 * 
 * Rules:
 * - Highest frequency across images wins
 * - Boost if appears in ≥2 images
 * - Boost if matches known family baseline
 * - Penalize one-off variants
 * 
 * Output:
 * - primaryStrainName
 * - alternateNames[]
 */
export function selectPrimaryNameFromClones(
  cloneGroups: CloneGroup[],
  perImageTopNames: string[], // Top candidate name per image
  imageCount: number
): PrimaryNameSelectionResult {
  if (cloneGroups.length === 0) {
    // No clone groups - fallback to most frequent name
    const nameFrequency = new Map<string, number>();
    perImageTopNames.forEach(name => {
      const normalized = normalizeRootName(name);
      if (normalized) {
        nameFrequency.set(normalized, (nameFrequency.get(normalized) || 0) + 1);
      }
    });
    
    const sortedNames = Array.from(nameFrequency.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const primaryName = sortedNames[0]?.[0] || perImageTopNames[0] || "Unknown";
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      normalizeRootName(s.name) === primaryName ||
      s.aliases?.some(a => normalizeRootName(a) === primaryName)
    );
    
    return {
      primaryStrainName: dbEntry?.name || primaryName,
      alternateNames: [],
      selectionReason: ["No clone groups detected - selected most frequent name"],
    };
  }
  
  // Phase 4.8.3 — Score each clone group
  const scoredGroups = cloneGroups.map(group => {
    let score = 0;
    const reasons: string[] = [];
    
    // Phase 4.8.3 — Rule 1: Highest frequency across images wins
    const frequency = perImageTopNames.filter(name => 
      normalizeRootName(name) === group.rootName
    ).length;
    
    score += frequency * 10; // 10 points per image appearance
    reasons.push(`Appears in ${frequency} of ${imageCount} images`);
    
    // Phase 4.8.3 — Rule 2: Boost if appears in ≥2 images
    if (frequency >= 2) {
      score += 15; // Significant boost for multi-image agreement
      reasons.push(`Multi-image agreement (≥2 images) - boosted`);
    }
    
    // Phase 4.8.3 — Rule 3: Boost if matches known family baseline
    const family = getStrainFamily(group.canonicalName);
    if (family && family.familyName) {
      score += 10; // Boost for known family
      reasons.push(`Matches known family baseline: ${family.familyName}`);
    }
    
    // Phase 4.8.3 — Rule 4: Penalize one-off variants
    if (group.variants.length === 1 && frequency === 1) {
      score -= 5; // Penalty for single variant, single image
      reasons.push(`One-off variant detected - penalized`);
    }
    
    // Phase 4.8.3 — Boost for high clone confidence
    score += group.cloneConfidence * 20; // Up to 20 points for clone confidence
    if (group.cloneConfidence > 0.7) {
      reasons.push(`High clone confidence (${Math.round(group.cloneConfidence * 100)}%)`);
    }
    
    // Phase 4.8.3 — Boost for strong lineage similarity
    if (group.similarityScores.lineageSimilarity > 0.7) {
      score += 5;
      reasons.push(`Strong lineage similarity (${Math.round(group.similarityScores.lineageSimilarity * 100)}%)`);
    }
    
    return {
      group,
      score,
      frequency,
      reasons,
    };
  });
  
  // Phase 4.8.3 — Sort by score (highest first)
  scoredGroups.sort((a, b) => b.score - a.score);
  
  const topGroup = scoredGroups[0];
  const primaryGroup = topGroup.group;
  
  // Phase 4.8.3 — Select primary name (use canonical name from database)
  const primaryStrainName = primaryGroup.canonicalName;
  
  // Phase 4.8.3 — Build alternate names (other variants in top group, or other groups)
  const alternateNames: Array<{
    name: string;
    canonicalName: string;
    reason: string;
  }> = [];
  
  // Add other variants from the primary group (excluding the canonical name)
  primaryGroup.variants.forEach(variant => {
    if (variant.name.toLowerCase() !== primaryStrainName.toLowerCase() &&
        variant.canonicalName.toLowerCase() !== primaryStrainName.toLowerCase()) {
      alternateNames.push({
        name: variant.name,
        canonicalName: variant.canonicalName,
        reason: `Same clone group (${primaryGroup.cloneGroupId}) - ${variant.evidence.join(", ")}`,
      });
    }
  });
  
  // Add variants from other high-scoring groups (if close in score)
  if (scoredGroups.length > 1) {
    const topScore = scoredGroups[0].score;
    scoredGroups.slice(1).forEach(scored => {
      // Only include if within 20 points of top score
      if (topScore - scored.score <= 20) {
        scored.group.variants.forEach(variant => {
          alternateNames.push({
            name: variant.name,
            canonicalName: variant.canonicalName,
            reason: `Alternative clone group (${scored.group.cloneGroupId}) - score ${Math.round(scored.score)} vs ${Math.round(topScore)}`,
          });
        });
      }
    });
  }
  
  // Phase 4.8.3 — Limit alternates to top 5
  const limitedAlternates = alternateNames.slice(0, 5);
  
  return {
    primaryStrainName,
    alternateNames: limitedAlternates,
    selectionReason: [
      `Selected from ${cloneGroups.length} clone group(s)`,
      ...topGroup.reasons,
      `Final score: ${Math.round(topGroup.score)}`,
    ],
    cloneGroupId: primaryGroup.cloneGroupId,
  };
}
