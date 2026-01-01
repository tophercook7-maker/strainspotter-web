/**
 * Shadow Model Utilities
 * Silent A/B testing for shadow model evaluation
 * Does NOT affect user outputs
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface LegacyMetrics {
  confidence: number;
  phenotype_agreement: number;
  similarity_score: number;
  match_confidence?: number;
}

export interface ShadowMetrics {
  confidence: number;
  phenotype_agreement: number;
  similarity_score: number;
  match_confidence?: number;
}

export interface DeltaMetrics {
  confidence_delta: number;
  phenotype_agreement_delta: number;
  similarity_score_delta: number;
  match_confidence_delta?: number;
}

/**
 * Run shadow model inference (placeholder)
 * In production, this would:
 * 1. Load shadow model artifacts
 * 2. Generate embeddings
 * 3. Compute similarity scores
 * 4. Return shadow metrics
 */
export async function runShadowInference(
  scanId: string,
  imageUrl: string,
  visualFeatures: any,
  phenotypeContext: any
): Promise<ShadowMetrics | null> {
  // TODO: Implement actual shadow model inference
  // For now, return placeholder metrics
  // This simulates shadow model output without actually running it
  
  try {
    // Placeholder: simulate shadow model output
    // In production, this would call the actual shadow model
    const shadowMetrics: ShadowMetrics = {
      confidence: 0.65, // Placeholder
      phenotype_agreement: 0.45, // Placeholder
      similarity_score: 0.72, // Placeholder
    };

    return shadowMetrics;
  } catch (error) {
    console.warn('[shadowModel] Shadow inference failed (non-blocking):', error);
    return null;
  }
}

/**
 * Compute comparison metrics between legacy and shadow
 */
export function computeComparisonMetrics(
  legacy: LegacyMetrics,
  shadow: ShadowMetrics | null
): {
  legacy_metrics: LegacyMetrics;
  shadow_metrics: ShadowMetrics | null;
  delta_metrics: DeltaMetrics | null;
} {
  if (!shadow) {
    return {
      legacy_metrics: legacy,
      shadow_metrics: null,
      delta_metrics: null,
    };
  }

  const delta: DeltaMetrics = {
    confidence_delta: shadow.confidence - legacy.confidence,
    phenotype_agreement_delta: shadow.phenotype_agreement - legacy.phenotype_agreement,
    similarity_score_delta: shadow.similarity_score - legacy.similarity_score,
  };

  if (shadow.match_confidence !== undefined && legacy.match_confidence !== undefined) {
    delta.match_confidence_delta = shadow.match_confidence - legacy.match_confidence;
  }

  return {
    legacy_metrics: legacy,
    shadow_metrics: shadow,
    delta_metrics: delta,
  };
}

/**
 * Store comparison in database (fire-and-forget)
 */
export async function storeComparison(
  scanId: string,
  legacy: LegacyMetrics,
  shadow: ShadowMetrics | null,
  delta: DeltaMetrics | null
): Promise<void> {
  if (!supabaseAdmin) {
    return; // Silently fail if admin client not available
  }

  try {
    await supabaseAdmin
      .from('model_comparisons')
      .insert({
        scan_id: scanId,
        legacy_metrics: legacy,
        shadow_metrics: shadow,
        delta_metrics: delta,
      });
  } catch (error) {
    // Fire-and-forget: log but don't throw
    console.warn('[shadowModel] Failed to store comparison (non-blocking):', error);
  }
}

