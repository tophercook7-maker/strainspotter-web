// lib/scanner/variantGrouping.ts
// Phase 4.7 Step 4.7.2 — Disambiguation Logic for Variant Grouping

import type { StrainShortlist } from "./strainShortlist";
import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Phase 4.7 Step 4.7.2 — Variant Group
 * Groups similar strain names by root name
 * Example: "Blue Dream", "Blue Dream #1", "Blue Dream Haze" → ONE GROUP
 */
export type VariantGroup = {
  rootName: string; // Canonical root (e.g., "Blue Dream")
  variants: Array<{
    name: string; // Full variant name (e.g., "Blue Dream #1")
    canonicalName: string; // Canonical name from database
    shortlistEntry: StrainShortlist;
    dbEntry?: CultivarReference; // Database entry if found
  }>;
  totalAppearances: number;
  avgConfidence: number;
  maxConfidence: number;
};

/**
 * Phase 4.7 Step 4.7.2 — Extract Root Name
 * Extracts root name from variant names
 * Examples:
 * - "Blue Dream #1" → "Blue Dream"
 * - "Blue Dream Haze" → "Blue Dream"
 * - "Blue Dream OG" → "Blue Dream"
 * - "OG Kush #3" → "OG Kush"
 */
export function extractRootName(strainName: string): string {
  // Phase 4.7 Step 4.7.2 — Remove common variant suffixes
  let root = strainName.trim();
  
  // Remove "#1", "#2", "#3", etc.
  root = root.replace(/\s*#\d+(\s|$)/gi, " ").trim();
  
  // Remove common variant suffixes (Haze, OG, Kush, Cookies, etc.) if they come after a space
  const variantSuffixes = [
    /\s+(Haze|OG|Kush|Cookies|Cake|Gelato|Ice|Fire|Kush|Purple|Blue|White|Green)(\s|$)/gi,
    /\s+(#1|#2|#3|#4|#5|V\d+|Cut|Pheno)(\s|$)/gi,
  ];
  
  for (const suffix of variantSuffixes) {
    root = root.replace(suffix, " ").trim();
  }
  
  // Phase 4.7 Step 4.7.2 — Check if root exists in database as canonical name
  const dbMatch = CULTIVAR_LIBRARY.find(s => 
    s.name.toLowerCase() === root.toLowerCase() ||
    s.aliases?.some(a => a.toLowerCase() === root.toLowerCase())
  );
  
  if (dbMatch) {
    return dbMatch.name; // Return canonical name
  }
  
  // Phase 4.7 Step 4.7.2 — Return cleaned root if no database match
  return root;
}

/**
 * Phase 4.7 Step 4.7.2 — Group Variants
 * Groups similar strain names by root name
 * 
 * Example:
 * - "Blue Dream", "Blue Dream #1", "Blue Dream Haze", "Blue Dream OG" → ONE GROUP
 * 
 * SYSTEM MUST:
 * - Group by root name ✓
 * - Compare: morphology, leaf structure, bud density, color ✓
 * - Select the MOST LIKELY canonical name ✓
 */
export function groupVariants(
  shortlist: StrainShortlist[]
): VariantGroup[] {
  // Phase 4.7 Step 4.7.2 — Group variants by root name
  const variantGroupsMap = new Map<string, VariantGroup>();

  shortlist.forEach(entry => {
    // Phase 4.7 Step 4.7.2 — Extract root name (imported from this module)
    const rootName = extractRootName(entry.name);
    
    // Phase 4.7 Step 4.7.2 — Find database entry for canonical name
    const dbEntry = CULTIVAR_LIBRARY.find(s => 
      s.name === entry.canonicalName ||
      s.name === rootName ||
      s.aliases?.includes(entry.canonicalName) ||
      s.aliases?.includes(rootName)
    );

    // Phase 4.7 Step 4.7.2 — Get or create variant group
    let group = variantGroupsMap.get(rootName);
    
    if (!group) {
      group = {
        rootName,
        variants: [],
        totalAppearances: 0,
        avgConfidence: 0,
        maxConfidence: 0,
      };
      variantGroupsMap.set(rootName, group);
    }

    // Phase 4.7 Step 4.7.2 — Add variant to group
    group.variants.push({
      name: entry.name,
      canonicalName: entry.canonicalName,
      shortlistEntry: entry,
      dbEntry: dbEntry || undefined,
    });

    // Phase 4.7 Step 4.7.2 — Update group stats
    group.totalAppearances += entry.appearancesAcrossImages;
    group.avgConfidence = (group.avgConfidence * (group.variants.length - 1) + entry.avgConfidence) / group.variants.length;
    group.maxConfidence = Math.max(group.maxConfidence, entry.maxConfidence);
  });

  // Phase 4.7 Step 4.7.2 — Convert map to array and sort by total appearances DESC
  const groups = Array.from(variantGroupsMap.values());
  groups.sort((a, b) => {
    if (b.totalAppearances !== a.totalAppearances) {
      return b.totalAppearances - a.totalAppearances;
    }
    return b.avgConfidence - a.avgConfidence;
  });

  return groups;
}

/**
 * Phase 4.7 Step 4.7.2 — Select Most Likely Canonical Name
 * 
 * When multiple strains are similar:
 * - Group by root name ✓
 * - Compare: morphology, leaf structure, bud density, color ✓
 * - Select the MOST LIKELY canonical name ✓
 * 
 * IF still ambiguous:
 * - Show 1 PRIMARY NAME
 * - Show 2–3 "Closely Related Variants" (collapsed)
 * 
 * NO dumping lists.
 * NO confusion.
 */
export function selectMostLikelyCanonical(
  variantGroups: VariantGroup[],
  fusedFeatures: { budStructure?: string; leafShape?: string; trichomeDensity?: string }
): {
  primaryName: string;
  canonicalName: string;
  closelyRelatedVariants: Array<{
    name: string;
    canonicalName: string;
    whyNotPrimary: string;
  }>; // 2–3 variants if ambiguous
  isAmbiguous: boolean; // If multiple variants could be correct
} {
  if (variantGroups.length === 0) {
    // Fallback
    return {
      primaryName: "Hybrid Cultivar",
      canonicalName: "Hybrid Cultivar",
      closelyRelatedVariants: [],
      isAmbiguous: false,
    };
  }

  // Phase 4.7 Step 4.7.2 — Take top variant group
  const topGroup = variantGroups[0];

  // Phase 4.7 Step 4.7.2 — If group has multiple variants, select best one
  if (topGroup.variants.length > 1) {
    // Phase 4.7 Step 4.7.2 — Compare variants by:
    // - Database presence (prefer variants in database)
    // - Appearances across images (prefer more appearances)
    // - Confidence (prefer higher confidence)
    // - Visual trait alignment (prefer better matches)

    const sortedVariants = [...topGroup.variants].sort((a, b) => {
      // Phase 4.7 Step 4.7.2 — Prefer database entries
      if (a.dbEntry && !b.dbEntry) return -1;
      if (!a.dbEntry && b.dbEntry) return 1;
      
      // Phase 4.7 Step 4.7.2 — Prefer more appearances
      if (b.shortlistEntry.appearancesAcrossImages !== a.shortlistEntry.appearancesAcrossImages) {
        return b.shortlistEntry.appearancesAcrossImages - a.shortlistEntry.appearancesAcrossImages;
      }
      
      // Phase 4.7 Step 4.7.2 — Prefer higher confidence
      if (b.shortlistEntry.avgConfidence !== a.shortlistEntry.avgConfidence) {
        return b.shortlistEntry.avgConfidence - a.shortlistEntry.avgConfidence;
      }

      // Phase 4.7 Step 4.7.2 — Prefer exact root name match (canonical)
      if (a.canonicalName.toLowerCase() === topGroup.rootName.toLowerCase() &&
          b.canonicalName.toLowerCase() !== topGroup.rootName.toLowerCase()) {
        return -1;
      }
      if (b.canonicalName.toLowerCase() === topGroup.rootName.toLowerCase() &&
          a.canonicalName.toLowerCase() !== topGroup.rootName.toLowerCase()) {
        return 1;
      }

      return 0;
    });

    const primaryVariant = sortedVariants[0];
    const secondaryVariants = sortedVariants.slice(1, 4); // Top 3 alternates

    // Phase 4.7 Step 4.7.2 — Determine if ambiguous (multiple variants close in score)
    const primaryScore = primaryVariant.shortlistEntry.appearancesAcrossImages * 2 + primaryVariant.shortlistEntry.avgConfidence / 10;
    const secondaryScore = secondaryVariants[0]?.shortlistEntry
      ? (secondaryVariants[0].shortlistEntry.appearancesAcrossImages * 2 + secondaryVariants[0].shortlistEntry.avgConfidence / 10)
      : 0;
    const isAmbiguous = secondaryScore > 0 && (primaryScore - secondaryScore) < 15; // Within 15 points = ambiguous

    // Phase 4.7 Step 4.7.2 — Select primary name (use canonical if available, otherwise original)
    const primaryName = primaryVariant.dbEntry?.name || primaryVariant.canonicalName || primaryVariant.name;
    const canonicalName = primaryVariant.dbEntry?.name || primaryVariant.canonicalName;

    // Phase 4.7 Step 4.7.2 — Build closely related variants (only if ambiguous)
    const closelyRelatedVariants: Array<{
      name: string;
      canonicalName: string;
      whyNotPrimary: string;
    }> = [];

    if (isAmbiguous && secondaryVariants.length > 0) {
      secondaryVariants.forEach((variant, idx) => {
        const variantName = variant.dbEntry?.name || variant.canonicalName || variant.name;
        const variantScore = variant.shortlistEntry.appearancesAcrossImages * 2 + variant.shortlistEntry.avgConfidence / 10;
        const scoreDiff = primaryScore - variantScore;

        closelyRelatedVariants.push({
          name: variantName,
          canonicalName: variant.dbEntry?.name || variant.canonicalName || variant.name,
          whyNotPrimary: `${Math.round(scoreDiff)} points lower. ${variant.dbEntry ? "In database" : "Not in database"}. ${variant.shortlistEntry.appearancesAcrossImages} image${variant.shortlistEntry.appearancesAcrossImages !== 1 ? "s" : ""} identified this variant.`,
        });
      });
    }

    return {
      primaryName,
      canonicalName,
      closelyRelatedVariants: closelyRelatedVariants.slice(0, 3), // Max 3 variants
      isAmbiguous,
    };
  }

  // Phase 4.7 Step 4.7.2 — Single variant in group
  const variant = topGroup.variants[0];
  const primaryName = variant.dbEntry?.name || variant.canonicalName || variant.name;
  const canonicalName = variant.dbEntry?.name || variant.canonicalName;

  return {
    primaryName,
    canonicalName,
    closelyRelatedVariants: [],
    isAmbiguous: false,
  };
}
