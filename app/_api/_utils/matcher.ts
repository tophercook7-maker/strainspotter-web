/**
 * Simple Text-Based Matcher
 * Matches vision text against strain names and aliases
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface MatchResult {
  match: {
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
  } | null;
  alternatives: Array<{
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
  }>;
}

interface Strain {
  id?: string;
  name: string;
  slug: string;
  aliases?: string[] | null;
}

/**
 * Normalize text for matching
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

/**
 * Score a strain against vision text
 */
function scoreStrain(strain: Strain, visionText: string[], filenameHint?: string): {
  score: number;
  reasoning: string;
} {
  const normalizedVision = visionText.map(normalizeText);
  const normalizedName = normalizeText(strain.name);
  const normalizedAliases = (strain.aliases || []).map(normalizeText);
  const normalizedFilename = filenameHint ? normalizeText(filenameHint) : '';

  // Combine all text sources
  const allText = [...normalizedVision, normalizedFilename].join(' ');

  // Exact name match in any vision text line
  for (const line of normalizedVision) {
    if (line.includes(normalizedName) || normalizedName.includes(line)) {
      return {
        score: 100,
        reasoning: `Exact name match found in image text: "${strain.name}"`,
      };
    }
  }

  // Check aliases
  for (const alias of normalizedAliases) {
    for (const line of normalizedVision) {
      if (line.includes(alias) || alias.includes(line)) {
        return {
          score: 95,
          reasoning: `Alias match found: "${alias}"`,
        };
      }
    }
  }

  // Partial word overlap
  const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 2);
  const aliasWords = normalizedAliases.flatMap(a => a.split(/\s+/).filter(w => w.length > 2));
  const allWords = [...nameWords, ...aliasWords];

  let matches = 0;
  let totalWords = allWords.length;

  if (totalWords === 0) {
    return { score: 0, reasoning: 'No matchable words found' };
  }

  for (const word of allWords) {
    if (allText.includes(word)) {
      matches++;
    }
  }

  if (matches === 0) {
    return { score: 0, reasoning: 'No matching words found' };
  }

  // Score based on word overlap percentage
  const baseScore = Math.round((matches / totalWords) * 100);
  const score = Math.max(40, Math.min(80, baseScore));

  return {
    score,
    reasoning: `${matches} of ${totalWords} words matched (${score}% confidence)`,
  };
}

/**
 * Match vision text against strain library
 */
export async function matchStrain(
  visionText: string[],
  filenameHint?: string
): Promise<MatchResult> {
  console.log(`[matcher] Matching with ${visionText.length} text lines, filename: ${filenameHint || 'none'}`);

  if (!supabaseAdmin) {
    console.warn('[matcher] Supabase admin not initialized');
    return { match: null, alternatives: [] };
  }

  // Load all strains
  const { data: strains, error } = await supabaseAdmin
    .from('strains')
    .select('id, name, slug, aliases')
    .limit(1000);

  if (error) {
    console.error('[matcher] Error loading strains:', error);
    return { match: null, alternatives: [] };
  }

  if (!strains || strains.length === 0) {
    console.warn('[matcher] No strains found in database');
    return { match: null, alternatives: [] };
  }

  console.log(`[matcher] Loaded ${strains.length} strains`);

  // Score all strains
  const scored = strains.map((strain: Strain) => {
    const result = scoreStrain(strain, visionText, filenameHint);
    return {
      strain,
      ...result,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Filter out scores below threshold (40)
  const aboveThreshold = scored.filter(s => s.score >= 40);

  if (aboveThreshold.length === 0) {
    console.log('[matcher] No matches above threshold (40%)');
    return {
      match: null,
      alternatives: scored.slice(0, 5).map(s => ({
        name: s.strain.name,
        slug: s.strain.slug,
        confidence: s.score,
        reasoning: s.reasoning,
      })),
    };
  }

  // Best match
  const best = aboveThreshold[0];

  console.log(`[matcher] Best match: ${best.strain.name} (${best.score}%)`);

  return {
    match: {
      name: best.strain.name,
      slug: best.strain.slug,
      confidence: best.score,
      reasoning: best.reasoning,
    },
    alternatives: aboveThreshold.slice(1, 6).map(s => ({
      name: s.strain.name,
      slug: s.strain.slug,
      confidence: s.score,
      reasoning: s.reasoning,
    })),
  };
}
