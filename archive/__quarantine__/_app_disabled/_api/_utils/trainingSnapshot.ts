/**
 * Training Snapshot Export Utility
 * Exports training data for shadow model retraining
 * Does not affect production outputs
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface TrainingCandidate {
  scan_id: string;
  image_url: string;
  image_path: string;
  visual_features: {
    bud_density?: string;
    bud_shape?: string;
    trichome_coverage?: string;
    secondary_pigmentation?: string;
  };
  phenotype_context?: {
    families: string[];
    common_traits: string[];
  };
  feedback_label?: 'agree' | 'unsure' | 'disagree';
  confidence_signals?: {
    image_quality: string;
    generated_confidence: number;
    phenotype_agreement: number;
  };
}

/**
 * Select training candidates based on quality and feedback criteria
 */
export async function selectTrainingCandidates(limit: number = 1000): Promise<TrainingCandidate[]> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized');
  }

  try {
    // Query scans with quality and feedback criteria
    // First, get scans with confidence signals matching criteria
    const { data: signals, error: signalsError } = await supabaseAdmin
      .from('scan_confidence_signals')
      .select('scan_id, image_quality, generated_confidence, phenotype_agreement')
      .in('image_quality', ['excellent', 'good'])
      .or('generated_confidence.lt.0.6,phenotype_agreement.lt.0.3');

    if (signalsError) {
      throw new Error(`Failed to query confidence signals: ${signalsError.message}`);
    }

    const scanIds = (signals || []).map((s: { scan_id: string }) => s.scan_id);

    if (scanIds.length === 0) {
      return [];
    }

    // Get scans with enrichment data
    const { data: scans, error: scansError } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        image_url,
        image_path,
        enrichment
      `)
      .in('id', scanIds)
      .not('enrichment->visual_features', 'is', null)
      .limit(limit);

    if (scansError) {
      throw new Error(`Failed to query scans: ${scansError.message}`);
    }

    // Get feedback for these scans
    const { data: feedbackData, error: feedbackError } = await supabaseAdmin
      .from('scan_feedback')
      .select('scan_id, feedback_type')
      .in('scan_id', scanIds);

    if (feedbackError) {
      console.warn('[trainingSnapshot] Error fetching feedback:', feedbackError);
    }

    // Create feedback map
    const feedbackMap = new Map<string, string>();
    (feedbackData || []).forEach(f => {
      feedbackMap.set(f.scan_id, f.feedback_type);
    });

    // Create signals map
    const signalsMap = new Map<string, { image_quality: string; generated_confidence: number; phenotype_agreement: number }>();
    (signals || []).forEach((s: { scan_id: string; image_quality: string; generated_confidence: number; phenotype_agreement: number }) => {
      signalsMap.set(s.scan_id, {
        image_quality: s.image_quality,
        generated_confidence: s.generated_confidence,
        phenotype_agreement: s.phenotype_agreement,
      });
    });

    // Transform to training candidate format
    const candidates: TrainingCandidate[] = [];

    for (const scan of scans || []) {
      const enrichment = scan.enrichment || {};
      const visualFeatures = enrichment.visual_features || {};
      const phenotypeContext = enrichment.phenotype_context || {};

      // Get confidence signals
      const signalData = signalsMap.get(scan.id);

      // Get feedback
      const feedbackType = feedbackMap.get(scan.id);

      // Calculate disagreement rate (if feedback exists)
      const disagreementRate = feedbackType === 'disagree' ? 1.0 : 0.0;

      // Filter: disagreement_rate > 0.25 OR generated_confidence < 0.6
      const generatedConfidence = signalData?.generated_confidence || 0;
      if (generatedConfidence >= 0.6 && disagreementRate <= 0.25) {
        continue; // Skip if doesn't meet criteria
      }

      candidates.push({
        scan_id: scan.id,
        image_url: scan.image_url,
        image_path: scan.image_path,
        visual_features: {
          bud_density: visualFeatures.bud_density,
          bud_shape: visualFeatures.bud_shape,
          trichome_coverage: visualFeatures.trichome_coverage,
          secondary_pigmentation: visualFeatures.secondary_pigmentation,
        },
        phenotype_context: phenotypeContext.families ? {
          families: phenotypeContext.families || [],
          common_traits: phenotypeContext.common_traits || [],
        } : undefined,
        feedback_label: feedbackType as 'agree' | 'unsure' | 'disagree' | undefined,
        confidence_signals: signalData ? {
          image_quality: signalData.image_quality || 'unknown',
          generated_confidence: signalData.generated_confidence || 0,
          phenotype_agreement: signalData.phenotype_agreement || 0,
        } : undefined,
      });
    }

    return candidates;
  } catch (error) {
    console.error('[trainingSnapshot] Error selecting training candidates:', error);
    throw error;
  }
}

/**
 * Export training candidates to JSONL format
 */
export async function exportTrainingSnapshot(limit: number = 1000): Promise<string> {
  const candidates = await selectTrainingCandidates(limit);
  
  // Convert to JSONL format (one JSON object per line)
  const jsonl = candidates
    .map(candidate => JSON.stringify(candidate))
    .join('\n');

  return jsonl;
}

/**
 * Export training candidates to structured JSON
 */
export async function exportTrainingSnapshotJSON(limit: number = 1000): Promise<TrainingCandidate[]> {
  return await selectTrainingCandidates(limit);
}

