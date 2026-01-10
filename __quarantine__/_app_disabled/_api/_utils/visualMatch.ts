/**
 * Visual Matching Utilities
 * Computes similarity scores between uploaded images and strain library
 */

import { VisionResults } from '@/app/api/_utils/vision';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

export interface StrainData {
  id?: string;
  name: string;
  slug: string;
  type?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  terpenes?: Array<{ name: string; percentage?: number }>;
  thc?: number | string;
  cbd?: number | string;
}

export interface MatchResult {
  match: {
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
    breakdown: {
      color: number;
      text: number;
      label: number;
      web: number;
    };
  } | null;
  alternatives: Array<{
    name: string;
    slug: string;
    confidence: number;
    reasoning: string;
  }>;
}

/**
 * Compute color similarity score (0-100)
 */
function computeColorScore(
  imageColors: { primary: string; secondary: string },
  strainColors?: { primary?: string; secondary?: string }
): number {
  if (!strainColors) return 0;

  let score = 0;
  let matches = 0;

  if (imageColors.primary && strainColors.primary) {
    const distance = colorDistance(imageColors.primary, strainColors.primary);
    score += Math.max(0, 100 - distance * 2);
    matches++;
  }

  if (imageColors.secondary && strainColors.secondary) {
    const distance = colorDistance(imageColors.secondary, strainColors.secondary);
    score += Math.max(0, 100 - distance * 2);
    matches++;
  }

  return matches > 0 ? Math.round(score / matches) : 0;
}

/**
 * Compute text similarity score (0-100)
 */
function computeTextScore(detectedText: string[], strainData: StrainData): number {
  if (!detectedText || detectedText.length === 0) return 0;

  const strainName = (strainData.name || '').toLowerCase();
  const text = detectedText.join(' ').toLowerCase();

  // Check for exact name match
  if (text.includes(strainName)) {
    return 100;
  }

  // Check for partial matches
  const nameWords = strainName.split(/\s+/);
  let matches = 0;
  for (const word of nameWords) {
    if (word.length > 3 && text.includes(word)) {
      matches++;
    }
  }

  return Math.round((matches / nameWords.length) * 100);
}

/**
 * Compute label similarity score (0-100)
 */
function computeLabelScore(detectedLabels: string[], strainData: StrainData): number {
  if (!detectedLabels || detectedLabels.length === 0) return 0;

  const relevantLabels = [
    'cannabis',
    'marijuana',
    'weed',
    'bud',
    'flower',
    'plant',
    'herb',
    'green',
    'leaf',
    'organic',
  ];

  let score = 0;
  for (const label of detectedLabels) {
    const labelLower = label.toLowerCase();
    if (relevantLabels.some((rl) => labelLower.includes(rl))) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * Compute web similarity score (placeholder)
 */
async function computeWebSimilarityScore(
  imageUrl: string | null,
  strainData: StrainData
): Promise<number> {
  // Placeholder for future web image similarity search
  return 0;
}

/**
 * Load strain library from Supabase
 */
export async function loadStrainLibrary(): Promise<StrainData[]> {
  if (!supabaseAdmin) {
    console.warn('Supabase admin not initialized, returning empty strain library');
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('strains')
      .select('*')
      .limit(1000);

    if (error) {
      console.error('Error loading strain library:', error);
      return [];
    }

    return (data || []) as StrainData[];
  } catch (error) {
    console.error('Failed to load strain library:', error);
    return [];
  }
}

/**
 * Find best matching strain
 */
export async function findBestMatch(
  visionResults: VisionResults,
  strainLibrary: StrainData[]
): Promise<MatchResult> {
  const { labels = [], text = [], colors = { primary: '#4a5568', secondary: '#718096' } } =
    visionResults;

  let bestMatch = null;
  let bestScore = 0;
  const scores: Array<{
    strain: StrainData;
    score: number;
    breakdown: { color: number; text: number; label: number; web: number };
  }> = [];

  for (const strain of strainLibrary) {
    const colorScore = computeColorScore(colors, strain.colors);
    const textScore = computeTextScore(text, strain);
    const labelScore = computeLabelScore(labels, strain);
    const webScore = await computeWebSimilarityScore(null, strain);

    // Weighted combination
    const totalScore =
      colorScore * 0.3 + textScore * 0.4 + labelScore * 0.2 + webScore * 0.1;

    scores.push({
      strain,
      score: totalScore,
      breakdown: {
        color: colorScore,
        text: textScore,
        label: labelScore,
        web: webScore,
      },
    });

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = strain;
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Get top 5 alternatives
  const alternatives = scores.slice(1, 6).map((s) => ({
    name: s.strain.name,
    slug: s.strain.slug,
    confidence: Math.round(s.score),
    reasoning: generateReasoning(s.breakdown),
  }));

  const bestScoreData = scores[0];

  return {
    match: bestMatch
      ? {
          name: bestMatch.name,
          slug: bestMatch.slug,
          confidence: Math.round(bestScore),
          reasoning: generateReasoning(bestScoreData.breakdown),
          breakdown: bestScoreData.breakdown,
        }
      : null,
    alternatives,
  };
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(breakdown: {
  color: number;
  text: number;
  label: number;
  web: number;
}): string {
  const parts: string[] = [];
  if (breakdown.text > 50) {
    parts.push(`Strong text match (${breakdown.text}%)`);
  }
  if (breakdown.color > 50) {
    parts.push(`Color similarity (${breakdown.color}%)`);
  }
  if (breakdown.label > 30) {
    parts.push(`Relevant labels detected (${breakdown.label}%)`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Limited match indicators';
}

/**
 * Calculate color distance in RGB space
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 100;

  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

