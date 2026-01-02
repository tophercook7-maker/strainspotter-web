/**
 * Strain Phenotype Index
 * Provides phenotype-based similarity matching for visual features
 * Does NOT claim strain identity - only provides descriptive context
 */

import { supabaseAdmin } from './supabaseAdmin';
import { isFeatureEnabled, FeatureFlagKey } from './featureFlags';

export interface VisualFeatures {
  bud_density?: 'sparse' | 'moderate' | 'compact' | 'dense';
  bud_shape?: 'elongated' | 'rounded_nug' | 'irregular' | 'unknown';
  trichome_coverage?: 'light' | 'moderate' | 'heavy' | 'unknown';
  secondary_pigmentation?: 'none' | 'purple_present' | 'orange_present' | 'mixed' | 'unknown';
}

export interface PhenotypeContext {
  families: string[];
  common_traits: string[];
  example_strains: string[];
}

interface StrainRecord {
  id: string;
  name: string;
  slug: string;
  aliases?: string[] | null;
  type?: string | null;
  colors?: any;
  description?: string | null;
}

/**
 * Extract strain family from name
 * Examples: "Blue Dream" -> "Dream", "OG Kush" -> "OG", "Girl Scout Cookies" -> "Cookies"
 */
function extractStrainFamily(name: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Common family patterns
  const familyPatterns = [
    { pattern: /(dream|dreams)/i, family: 'Dream' },
    { pattern: /(og|og kush)/i, family: 'OG' },
    { pattern: /(cookies|cookie)/i, family: 'Cookies' },
    { pattern: /(kush)/i, family: 'Kush' },
    { pattern: /(haze)/i, family: 'Haze' },
    { pattern: /(diesel)/i, family: 'Diesel' },
    { pattern: /(berry|berries)/i, family: 'Berry' },
    { pattern: /(cake)/i, family: 'Cake' },
    { pattern: /(sherbet|sherbert)/i, family: 'Sherbet' },
    { pattern: /(gelato)/i, family: 'Gelato' },
    { pattern: /(skunk)/i, family: 'Skunk' },
    { pattern: /(purple)/i, family: 'Purple' },
    { pattern: /(white)/i, family: 'White' },
    { pattern: /(blue)/i, family: 'Blue' },
    { pattern: /(pink)/i, family: 'Pink' },
  ];

  for (const { pattern, family } of familyPatterns) {
    if (pattern.test(nameLower)) {
      return family;
    }
  }

  return null;
}

/**
 * Normalize visual features into searchable traits
 */
function normalizeVisualTraits(features: VisualFeatures): string[] {
  const traits: string[] = [];

  if (features.bud_density) {
    if (features.bud_density === 'dense' || features.bud_density === 'compact') {
      traits.push('dense_bud');
      traits.push('compact_structure');
    } else if (features.bud_density === 'sparse') {
      traits.push('airy_bud');
    }
  }

  if (features.bud_shape) {
    if (features.bud_shape === 'rounded_nug') {
      traits.push('rounded_nug');
    } else if (features.bud_shape === 'elongated') {
      traits.push('elongated_bud');
    }
  }

  if (features.trichome_coverage) {
    if (features.trichome_coverage === 'heavy') {
      traits.push('heavy_trichomes');
      traits.push('frosty');
    } else if (features.trichome_coverage === 'light') {
      traits.push('light_trichomes');
    }
  }

  if (features.secondary_pigmentation) {
    if (features.secondary_pigmentation === 'purple_present') {
      traits.push('purple_hues');
    } else if (features.secondary_pigmentation === 'orange_present') {
      traits.push('orange_hues');
    } else if (features.secondary_pigmentation === 'mixed') {
      traits.push('mixed_colors');
    }
  }

  return traits;
}

/**
 * Score strain similarity based on visual features (LEGACY)
 * Returns a simple score (0-1) based on name/alias matching
 */
function scoreStrainSimilarityLegacy(
  strain: StrainRecord,
  traits: string[]
): number {
  let score = 0;
  const nameLower = strain.name.toLowerCase();
  const aliases = (strain.aliases || []).map(a => a.toLowerCase());
  const allText = [nameLower, ...aliases].join(' ');

  // Match traits in name/aliases
  for (const trait of traits) {
    if (allText.includes(trait.replace('_', ' '))) {
      score += 0.2;
    }
  }

  // Boost for common descriptive terms
  const descriptiveTerms = ['purple', 'blue', 'white', 'pink', 'frosty', 'dense', 'compact'];
  for (const term of descriptiveTerms) {
    if (allText.includes(term)) {
      score += 0.1;
    }
  }

  return Math.min(1.0, score);
}

/**
 * Score strain similarity using shadow model (V2)
 * Enhanced scoring with improved trait matching and context awareness
 */
function scoreStrainSimilarityShadow(
  strain: StrainRecord,
  traits: string[],
  visualFeatures: VisualFeatures
): number {
  let score = 0;
  const nameLower = strain.name.toLowerCase();
  const aliases = (strain.aliases || []).map(a => a.toLowerCase());
  const allText = [nameLower, ...aliases].join(' ');
  const description = (strain.description || '').toLowerCase();

  // Enhanced trait matching with weighted scoring
  for (const trait of traits) {
    const traitText = trait.replace('_', ' ');
    if (allText.includes(traitText)) {
      score += 0.25; // Slightly higher weight
    }
    if (description.includes(traitText)) {
      score += 0.15; // Description matches also count
    }
  }

  // Context-aware matching based on visual features
  if (visualFeatures.bud_density === 'dense' || visualFeatures.bud_density === 'compact') {
    if (allText.includes('dense') || allText.includes('compact') || description.includes('dense')) {
      score += 0.2;
    }
  }

  if (visualFeatures.trichome_coverage === 'heavy') {
    if (allText.includes('frosty') || allText.includes('trichome') || description.includes('frosty')) {
      score += 0.2;
    }
  }

  if (visualFeatures.secondary_pigmentation === 'purple_present') {
    if (allText.includes('purple') || description.includes('purple')) {
      score += 0.2;
    }
  }

  // Boost for common descriptive terms (same as legacy)
  const descriptiveTerms = ['purple', 'blue', 'white', 'pink', 'frosty', 'dense', 'compact'];
  for (const term of descriptiveTerms) {
    if (allText.includes(term)) {
      score += 0.1;
    }
  }

  // Type-based matching (indica/sativa/hybrid)
  if (strain.type && visualFeatures.bud_shape) {
    if (strain.type.toLowerCase() === 'indica' && visualFeatures.bud_shape === 'rounded_nug') {
      score += 0.1; // Indicas often have rounded nugs
    }
    if (strain.type.toLowerCase() === 'sativa' && visualFeatures.bud_shape === 'elongated') {
      score += 0.1; // Sativas often have elongated buds
    }
  }

  return Math.min(1.0, score);
}

/**
 * Find phenotype-similar strains based on visual features
 * Returns descriptive context, NOT identifications
 * Supports shadow model similarity scoring via feature flag
 */
export async function findPhenotypeSimilarStrains(
  scanFeatures: VisualFeatures | null | undefined,
  limit: number = 10,
  scanId?: string
): Promise<PhenotypeContext> {
  if (!scanFeatures || !supabaseAdmin) {
    return {
      families: [],
      common_traits: [],
      example_strains: [],
    };
  }

  try {
    // Check feature flag for shadow phenotype similarity v2
    let useShadowScoring = false;
    try {
      useShadowScoring = await isFeatureEnabled(
        'phenotype_similarity_v2' as FeatureFlagKey,
        null,
        null,
        false // Default to false (legacy)
      );
      
      // Log when shadow scoring is active
      if (useShadowScoring && scanId) {
        console.log(`[phenotypeIndex] phenotype_similarity_v2_active for scan: ${scanId}`);
      }
    } catch (flagError) {
      // Fail safely - default to legacy
      console.warn('[phenotypeIndex] Error checking feature flag, using legacy scoring:', flagError);
      useShadowScoring = false;
    }

    // Load all strains (with available phenotype data)
    const { data: strains, error } = await supabaseAdmin
      .from('strains')
      .select('id, name, slug, aliases, type, colors, description')
      .limit(500); // Reasonable limit for phenotype matching

    if (error || !strains || strains.length === 0) {
      console.warn('[phenotypeIndex] No strains available for phenotype matching');
      return {
        families: [],
        common_traits: [],
        example_strains: [],
      };
    }

    // Normalize visual features into searchable traits
    const traits = normalizeVisualTraits(scanFeatures);

    if (traits.length === 0) {
      // No traits to match on
      return {
        families: [],
        common_traits: traits,
        example_strains: [],
      };
    }

    // Score and rank strains (using shadow or legacy scoring)
    const scored = strains
      .map(strain => ({
        strain,
        score: useShadowScoring
          ? scoreStrainSimilarityShadow(strain, traits, scanFeatures)
          : scoreStrainSimilarityLegacy(strain, traits),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Extract families from top matches
    const familySet = new Set<string>();
    const exampleStrains: string[] = [];

    for (const { strain } of scored) {
      const family = extractStrainFamily(strain.name);
      if (family) {
        familySet.add(family);
      }
      exampleStrains.push(strain.name);
    }

    // Deduplicate families
    const families = Array.from(familySet).slice(0, 5);

    // Build common traits list from matched traits
    const commonTraits = traits.slice(0, 5);

    return {
      families,
      common_traits: commonTraits,
      example_strains: exampleStrains.slice(0, 5),
    };
  } catch (error) {
    console.error('[phenotypeIndex] Error finding similar strains:', error);
    return {
      families: [],
      common_traits: [],
      example_strains: [],
    };
  }
}

