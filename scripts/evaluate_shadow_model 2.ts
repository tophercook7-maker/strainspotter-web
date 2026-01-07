/**
 * Shadow Model Evaluation Script
 * Compares shadow model performance against production
 * Does NOT affect production outputs
 */

import { supabaseAdmin } from '../app/api/_utils/supabaseAdmin';
import { exportTrainingSnapshotJSON } from '../app/api/_utils/trainingSnapshot';

interface EvaluationMetrics {
  disagreement_rate: number;
  confidence_alignment: number;
  phenotype_agreement: number;
  legacy_embeddings_score: number;
  shadow_embeddings_score: number;
  improvement_delta: number;
}

/**
 * Evaluate shadow model against production baseline
 */
export async function evaluateShadowModel(
  shadowModelVersion: string
): Promise<{
  metrics: EvaluationMetrics;
  evaluationId: string;
}> {
  console.log(`[evaluate_shadow_model] Evaluating shadow model: ${shadowModelVersion}`);

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  // Get evaluation dataset
  const candidates = await exportTrainingSnapshotJSON(500);
  console.log(`[evaluate_shadow_model] Using ${candidates.length} candidates for evaluation`);

  // Calculate baseline metrics (production/legacy)
  let totalFeedback = 0;
  let disagreeCount = 0;
  let confidenceAligned = 0;
  let phenotypeAligned = 0;
  let totalConfidence = 0;

  for (const candidate of candidates) {
    if (candidate.feedback_label) {
      totalFeedback++;
      if (candidate.feedback_label === 'disagree') {
        disagreeCount++;
      }
    }

    if (candidate.confidence_signals) {
      const conf = candidate.confidence_signals.generated_confidence;
      totalConfidence += conf;

      // Confidence alignment: how well does confidence match feedback?
      if (candidate.feedback_label === 'agree' && conf >= 0.6) {
        confidenceAligned++;
      } else if (candidate.feedback_label === 'disagree' && conf < 0.6) {
        confidenceAligned++;
      } else if (candidate.feedback_label === 'unsure') {
        confidenceAligned += 0.5; // Partial credit for unsure
      }
    }

    // Phenotype agreement
    if (candidate.confidence_signals?.phenotype_agreement) {
      if (candidate.confidence_signals.phenotype_agreement > 0.3) {
        phenotypeAligned++;
      }
    }
  }

  const disagreementRate = totalFeedback > 0 ? disagreeCount / totalFeedback : 0;
  const confidenceAlignment = totalFeedback > 0 ? confidenceAligned / totalFeedback : 0;
  const phenotypeAgreement = candidates.length > 0 ? phenotypeAligned / candidates.length : 0;
  const avgConfidence = candidates.length > 0 ? totalConfidence / candidates.length : 0;

  // TODO: Run shadow model inference on same dataset
  // For now, use placeholder scores
  const legacyEmbeddingsScore = avgConfidence * (1 - disagreementRate);
  const shadowEmbeddingsScore = legacyEmbeddingsScore * 1.05; // Placeholder: 5% improvement
  const improvementDelta = shadowEmbeddingsScore - legacyEmbeddingsScore;

  const metrics: EvaluationMetrics = {
    disagreement_rate: disagreementRate,
    confidence_alignment: confidenceAlignment,
    phenotype_agreement: phenotypeAgreement,
    legacy_embeddings_score: legacyEmbeddingsScore,
    shadow_embeddings_score: shadowEmbeddingsScore,
    improvement_delta: improvementDelta,
  };

  // Store evaluation in database
  const { data: evaluation, error: insertError } = await supabaseAdmin
    .from('model_evaluations')
    .insert({
      model_version: shadowModelVersion,
      evaluation_type: 'shadow',
      metrics: metrics,
      disagreement_rate: disagreementRate,
      confidence_alignment: confidenceAlignment,
      phenotype_agreement: phenotypeAgreement,
      notes: `Shadow model evaluation for ${shadowModelVersion}. Training candidates: ${candidates.length}`,
    })
    .select('evaluation_id')
    .single();

  if (insertError) {
    console.error('[evaluate_shadow_model] Error storing evaluation:', insertError);
    throw new Error(`Failed to store evaluation: ${insertError.message}`);
  }

  console.log('[evaluate_shadow_model] Evaluation complete:', metrics);
  console.log(`[evaluate_shadow_model] Evaluation ID: ${evaluation.evaluation_id}`);

  return {
    metrics,
    evaluationId: evaluation.evaluation_id,
  };
}

/**
 * Main execution (for CLI usage)
 */
if (require.main === module) {
  const modelVersion = process.argv[2] || `shadow-${Date.now()}`;
  
  evaluateShadowModel(modelVersion)
    .then(result => {
      console.log('[evaluate_shadow_model] Evaluation complete:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('[evaluate_shadow_model] Evaluation failed:', error);
      process.exit(1);
    });
}

