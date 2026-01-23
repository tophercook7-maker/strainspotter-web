// Phase 4.6.1 — Strain Family Map
// lib/scanner/strainFamilyMap.ts

import { CULTIVAR_LIBRARY, type CultivarReference } from "./cultivarLibrary";

/**
 * Known canonical family names
 * These are the "founder" strains that define families
 */
const CANONICAL_FAMILIES = [
  "OG Kush",
  "Haze",
  "Cookies",
  "Kush",
  "Blueberry",
  "Northern Lights",
  "White Widow",
  "Skunk",
  "Afghan",
  "Thai",
  "Chemdawg",
  "Diesel",
  "Purple",
  "Gelato",
  "Zkittlez",
  "Wedding Cake",
  "Gorilla Glue",
  "Girl Scout Cookies",
  "GSC",
  "Sour",
  "Jack Herer",
  "AK-47",
  "Trainwreck",
  "Durban Poison",
  "Granddaddy Purple",
  "GDP",
  "Pineapple Express",
  "Bruce Banner",
  "Dosidos",
  "Strawberry Cough",
  "Green Crack",
  "Bubble Gum",
] as const;

/**
 * Family name normalization map
 * Maps aliases and variations to canonical family names
 */
const FAMILY_ALIAS_MAP: Record<string, string> = {
  // OG Kush family
  "og": "OG Kush",
  "ogk": "OG Kush",
  "og kush": "OG Kush",
  "kush": "Kush",
  "hindu kush": "Kush",
  "afghan kush": "Kush",
  
  // Haze family
  "haze": "Haze",
  "purple haze": "Haze",
  "silver haze": "Haze",
  "super silver haze": "Haze",
  "amnesia haze": "Haze",
  
  // Cookies family
  "cookies": "Cookies",
  "gsc": "Cookies",
  "girl scout cookies": "Cookies",
  "wedding cake": "Wedding Cake",
  "gelato": "Gelato",
  "zkittlez": "Zkittlez",
  "zkittles": "Zkittlez",
  
  // Diesel family
  "diesel": "Diesel",
  "sour diesel": "Diesel",
  "sour d": "Diesel",
  "sour": "Diesel",
  
  // Purple family
  "purple": "Purple",
  "granddaddy purple": "Purple",
  "gdp": "Purple",
  "purple urkle": "Purple",
  "purple kush": "Purple",
  
  // Chemdawg family
  "chemdawg": "Chemdawg",
  "chem": "Chemdawg",
  "chemdog": "Chemdawg",
};

/**
 * Extract parent strain names from genetics string
 */
function extractParents(genetics: string): string[] {
  if (!genetics || genetics.trim() === "" || genetics === "Unknown") {
    return [];
  }

  const parents: string[] = [];
  const patterns = [
    /([^×x/]+)\s*[×x/]\s*([^×x/]+)/gi,
    /([^×x/]+)\s+and\s+([^×x/]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = genetics.matchAll(pattern);
    for (const match of matches) {
      const parts = match[0].split(/[×x/]/).map(p => p.trim());
      parents.push(...parts);
    }
  }

  return parents
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.toLowerCase().includes("unknown"));
}

/**
 * Normalize strain name for family matching
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Check if a strain name matches a canonical family
 */
function matchesCanonicalFamily(strainName: string, parents: string[]): string | null {
  const normalized = normalizeName(strainName);
  
  // Check direct name match
  for (const family of CANONICAL_FAMILIES) {
    if (normalizeName(family) === normalized) {
      return family;
    }
  }
  
  // Check alias map
  if (FAMILY_ALIAS_MAP[normalized]) {
    return FAMILY_ALIAS_MAP[normalized];
  }
  
  // Check if any parent matches a canonical family
  for (const parent of parents) {
    const normalizedParent = normalizeName(parent);
    for (const family of CANONICAL_FAMILIES) {
      if (normalizeName(family) === normalizedParent) {
        return family;
      }
    }
    // Check alias map for parent
    if (FAMILY_ALIAS_MAP[normalizedParent]) {
      return FAMILY_ALIAS_MAP[normalizedParent];
    }
  }
  
  return null;
}

/**
 * Find family name from lineage (recursive parent lookup)
 */
function findFamilyFromLineage(
  strain: CultivarReference,
  visited: Set<string> = new Set()
): string | null {
  const strainKey = strain.name.toLowerCase();
  
  // Prevent infinite loops
  if (visited.has(strainKey)) {
    return null;
  }
  visited.add(strainKey);
  
  // Check if this strain is a canonical family
  const directMatch = matchesCanonicalFamily(strain.name, []);
  if (directMatch) {
    return directMatch;
  }
  
  // Extract parents from genetics
  const parents = extractParents(strain.genetics);
  if (parents.length === 0) {
    return null;
  }
  
  // Check if any parent matches a canonical family
  const parentFamily = matchesCanonicalFamily("", parents);
  if (parentFamily) {
    return parentFamily;
  }
  
  // Recursively check parents
  for (const parentName of parents) {
    const parentStrain = CULTIVAR_LIBRARY.find(s => 
      normalizeName(s.name) === normalizeName(parentName) ||
      s.aliases.some(a => normalizeName(a) === normalizeName(parentName))
    );
    
    if (parentStrain) {
      const family = findFamilyFromLineage(parentStrain, visited);
      if (family) {
        return family;
      }
    }
  }
  
  return null;
}

/**
 * Strain family information
 */
export type StrainFamily = {
  familyName: string;
  siblingStrains: string[]; // All strains in this family
  parentLineage: string[]; // Direct parent strains
};

/**
 * Build strain family map from database
 * Groups strains by common lineage and canonical families
 */
export function buildStrainFamilyMap(): Map<string, StrainFamily> {
  const familyMap = new Map<string, StrainFamily>();
  const strainToFamily = new Map<string, string>(); // strain name -> family name
  
  // First pass: Identify family for each strain
  for (const strain of CULTIVAR_LIBRARY) {
    const familyName = findFamilyFromLineage(strain);
    if (familyName) {
      strainToFamily.set(strain.name, familyName);
    }
  }
  
  // Second pass: Group strains by family
  for (const [strainName, familyName] of strainToFamily.entries()) {
    if (!familyMap.has(familyName)) {
      familyMap.set(familyName, {
        familyName,
        siblingStrains: [],
        parentLineage: [],
      });
    }
    
    const family = familyMap.get(familyName)!;
    family.siblingStrains.push(strainName);
    
    // Extract and store parent lineage
    const strain = CULTIVAR_LIBRARY.find(s => s.name === strainName);
    if (strain) {
      const parents = extractParents(strain.genetics);
      for (const parent of parents) {
        if (!family.parentLineage.includes(parent)) {
          family.parentLineage.push(parent);
        }
      }
    }
  }
  
  // Sort sibling strains alphabetically
  for (const family of familyMap.values()) {
    family.siblingStrains.sort();
    family.parentLineage.sort();
  }
  
  return familyMap;
}

/**
 * Get family information for a specific strain
 */
export function getStrainFamily(strainName: string): StrainFamily | null {
  const familyMap = buildStrainFamilyMap();
  
  // Find which family this strain belongs to
  for (const [familyName, family] of familyMap.entries()) {
    if (family.siblingStrains.includes(strainName)) {
      return family;
    }
  }
  
  // Check if strain itself is a canonical family
  const normalized = normalizeName(strainName);
  for (const family of CANONICAL_FAMILIES) {
    if (normalizeName(family) === normalized) {
      return {
        familyName: family,
        siblingStrains: [strainName],
        parentLineage: [],
      };
    }
  }
  
  return null;
}

/**
 * Get all sibling strains in the same family
 */
export function getSiblingStrains(strainName: string): string[] {
  const family = getStrainFamily(strainName);
  if (!family) {
    return [];
  }
  
  // Return siblings excluding the strain itself
  return family.siblingStrains.filter(s => s !== strainName);
}

/**
 * Get parent lineage for a strain
 */
export function getParentLineage(strainName: string): string[] {
  const strain = CULTIVAR_LIBRARY.find(s => s.name === strainName);
  if (!strain) {
    return [];
  }
  
  return extractParents(strain.genetics);
}
