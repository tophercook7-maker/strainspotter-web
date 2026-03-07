// lib/scanner/nameNormalization.ts
// STEP 6.0.1 — ROOT NAME NORMALIZATION

/**
 * Normalizes a strain name by stripping clone markers, breeder tags, and location tags.
 * Example: "OG Kush #1 (SFV Cut)" -> "og kush"
 */
export function normalizeStrainName(name: string): string {
  if (!name) return "";

  let normalized = name.toLowerCase().trim();

  // 1. Strip clone markers like #1, #2, Pheno, Cut, Clone, etc.
  normalized = normalized.replace(/#\d+/g, "");
  normalized = normalized.replace(/\b(pheno|cut|clone|variant|selection|phenotype|f\d+|s\d+|bx\d+)\b/g, "");

  // 2. Strip breeder tags in parentheses or brackets
  // Example: (SFV), [Archive], (NorCal), [Breeder]
  normalized = normalized.replace(/\([^)]+\)/g, "");
  normalized = normalized.replace(/\[[^\]]+\]/g, "");

  // 3. Strip common location/breeder prefixes/suffixes
  // Example: SFV OG -> OG
  const commonTags = [
    "sfv", "norcal", "socal", "bay", "mendocino", "humboldt", "emerald",
    "archive", "jungle boys", "cookies fam", "barneys", "dutch passion",
    "green house", "dna", "reserva", "ethos", "compound", "seed junky"
  ];

  commonTags.forEach(tag => {
    const regex = new RegExp(`\\b${tag}\\b`, "g");
    normalized = normalized.replace(regex, "");
  });

  // 4. Clean up extra spaces and special characters
  normalized = normalized.replace(/[^a-z0-9\s]/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Checks if two strain names belong to the same root name group.
 */
export function isSameRootName(name1: string, name2: string): boolean {
  return normalizeStrainName(name1) === normalizeStrainName(name2);
}
