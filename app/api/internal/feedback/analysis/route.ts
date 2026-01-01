import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { requireAdminAPI } from '@/lib/adminAuth';

/**
 * GET /api/internal/feedback/analysis
 * Admin-only endpoint for feedback calibration analysis
 * Read-only, observational only
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check - admin role required
    await requireAdminAPI();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Join scan_feedback with scan_confidence_signals
    const { data: feedbackWithSignals, error: joinError } = await supabaseAdmin
      .from('scan_feedback')
      .select(`
        feedback_type,
        scan_confidence_signals!inner(
          generated_confidence,
          image_quality
        )
      `);

    if (joinError) {
      console.error('[internal/feedback/analysis] Error joining data:', joinError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback analysis data' },
        { status: 500 }
      );
    }

    // Aggregate by confidence level
    const byConfidenceMap = new Map<string, { agree: number; unsure: number; disagree: number }>();

    // Aggregate by image quality
    const byImageQualityMap = new Map<string, { agree: number; unsure: number; disagree: number }>();

    // Overall counts
    let totalAgree = 0;
    let totalUnsure = 0;
    let totalDisagree = 0;

    feedbackWithSignals?.forEach((item: any) => {
      const feedbackType = item.feedback_type;
      const signals = item.scan_confidence_signals;

      if (!signals) return;

      // Map generated_confidence to confidence level
      const confidence = signals.generated_confidence;
      let confidenceLevel: 'low' | 'moderate' | 'high' = 'low';
      if (confidence !== null && confidence !== undefined) {
        if (confidence >= 0.7) {
          confidenceLevel = 'high';
        } else if (confidence >= 0.4) {
          confidenceLevel = 'moderate';
        } else {
          confidenceLevel = 'low';
        }
      }

      // Aggregate by confidence level
      if (!byConfidenceMap.has(confidenceLevel)) {
        byConfidenceMap.set(confidenceLevel, { agree: 0, unsure: 0, disagree: 0 });
      }
      const confData = byConfidenceMap.get(confidenceLevel)!;
      if (feedbackType === 'agree') confData.agree++;
      else if (feedbackType === 'unsure') confData.unsure++;
      else if (feedbackType === 'disagree') confData.disagree++;

      // Aggregate by image quality
      const imageQuality = signals.image_quality || 'unknown';
      if (!byImageQualityMap.has(imageQuality)) {
        byImageQualityMap.set(imageQuality, { agree: 0, unsure: 0, disagree: 0 });
      }
      const qualityData = byImageQualityMap.get(imageQuality)!;
      if (feedbackType === 'agree') qualityData.agree++;
      else if (feedbackType === 'unsure') qualityData.unsure++;
      else if (feedbackType === 'disagree') qualityData.disagree++;

      // Overall counts
      if (feedbackType === 'agree') totalAgree++;
      else if (feedbackType === 'unsure') totalUnsure++;
      else if (feedbackType === 'disagree') totalDisagree++;
    });

    // Convert maps to arrays
    const byConfidence = Array.from(byConfidenceMap.entries())
      .map(([confidence_level, counts]) => ({
        confidence_level: confidence_level as 'low' | 'moderate' | 'high',
        ...counts,
      }))
      .sort((a, b) => {
        const order = { low: 0, moderate: 1, high: 2 };
        return order[a.confidence_level] - order[b.confidence_level];
      });

    const byImageQuality = Array.from(byImageQualityMap.entries())
      .map(([image_quality, counts]) => ({
        image_quality,
        ...counts,
      }))
      .sort((a, b) => a.image_quality.localeCompare(b.image_quality));

    // Calculate overall rates
    const total = totalAgree + totalUnsure + totalDisagree;
    const overall = {
      agree_rate: total > 0 ? totalAgree / total : 0,
      unsure_rate: total > 0 ? totalUnsure / total : 0,
      disagree_rate: total > 0 ? totalDisagree / total : 0,
    };

    return NextResponse.json({
      by_confidence: byConfidence,
      by_image_quality: byImageQuality,
      overall,
    });
  } catch (error: unknown) {
    console.error('[internal/feedback/analysis] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

