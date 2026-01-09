/**
 * Trend Aggregator
 * Aggregates phenotype patterns for trend memory
 * Non-realtime, additive only
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface PhenotypeSignature {
  traits: string[];
  families: string[];
  visual_features: {
    bud_density?: string;
    bud_shape?: string;
    trichome_coverage?: string;
    secondary_pigmentation?: string;
  };
}

/**
 * Generate normalized phenotype signature from enrichment data
 */
export function generatePhenotypeSignature(
  enrichment: any,
  phenotypeContext: { families: string[]; common_traits: string[] }
): PhenotypeSignature {
  const visualFeatures = enrichment?.visual_features || {};
  const traits = phenotypeContext.common_traits || [];
  
  // Normalize and sort traits for consistent signatures
  const normalizedTraits = traits
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 0)
    .sort();
  
  const normalizedFamilies = (phenotypeContext.families || [])
    .map(f => f.toLowerCase().trim())
    .filter(f => f.length > 0)
    .sort();
  
  return {
    traits: normalizedTraits,
    families: normalizedFamilies,
    visual_features: {
      bud_density: visualFeatures.bud_density || undefined,
      bud_shape: visualFeatures.bud_shape || undefined,
      trichome_coverage: visualFeatures.trichome_coverage || undefined,
      secondary_pigmentation: visualFeatures.secondary_pigmentation || undefined,
    },
  };
}

/**
 * Upsert phenotype trend
 * Increments occurrence count and updates timestamps
 */
export async function upsertPhenotypeTrend(
  signature: PhenotypeSignature,
  scope: 'global' | 'brand' | 'grower' | 'batch' = 'global',
  scopeId?: string
): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('[trendAggregator] Supabase admin not available, skipping trend upsert');
    return;
  }

  try {
    // Check if trend exists (match by signature)
    const { data: existing, error: queryError } = await supabaseAdmin
      .from('phenotype_trends')
      .select('trend_id, occurrence_count')
      .eq('scope', scope)
      .eq('scope_id', scopeId || null)
      .eq('phenotype_signature', JSON.stringify(signature))
      .maybeSingle();

    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }

    if (existing) {
      // Update existing trend
      const { error: updateError } = await supabaseAdmin
        .from('phenotype_trends')
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_seen: new Date().toISOString(),
        })
        .eq('trend_id', existing.trend_id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Insert new trend
      const { error: insertError } = await supabaseAdmin
        .from('phenotype_trends')
        .insert({
          scope,
          scope_id: scopeId || null,
          phenotype_signature: signature,
          occurrence_count: 1,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }
    }
  } catch (error) {
    // Non-blocking: log but don't throw
    console.warn('[trendAggregator] Failed to upsert trend (non-blocking):', error);
  }
}

