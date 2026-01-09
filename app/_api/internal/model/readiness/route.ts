/**
 * Shadow Model Promotion Readiness API
 * Admin-only, read-only aggregation of A/B test comparison data
 * Does NOT promote any model
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI(); // Admin-only access

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Fetch all model comparisons
    const { data: comparisons, error } = await supabaseAdmin
      .from('model_comparisons')
      .select('legacy_metrics, shadow_metrics, delta_metrics')
      .not('delta_metrics', 'is', null);

    if (error) {
      console.error('[model/readiness] Error fetching comparisons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comparison data' },
        { status: 500 }
      );
    }

    if (!comparisons || comparisons.length === 0) {
      return NextResponse.json({
        overall: {
          total_comparisons: 0,
          shadow_better_rate: 0,
          shadow_worse_rate: 0,
          neutral_rate: 0,
        },
        by_metric: {
          confidence_alignment: { improved: 0, regressed: 0, neutral: 0 },
          phenotype_agreement: { improved: 0, regressed: 0, neutral: 0 },
          similarity_score: { improved: 0, regressed: 0, neutral: 0 },
        },
        recommendation: {
          status: 'not_ready' as const,
          reason: 'Insufficient comparison data',
        },
      });
    }

    // Initialize counters
    let totalComparisons = 0;
    let shadowBetter = 0;
    let shadowWorse = 0;
    let neutral = 0;

    const metricCounts = {
      confidence_alignment: { improved: 0, regressed: 0, neutral: 0 },
      phenotype_agreement: { improved: 0, regressed: 0, neutral: 0 },
      similarity_score: { improved: 0, regressed: 0, neutral: 0 },
    };

    // Process each comparison
    for (const comp of comparisons) {
      const delta = comp.delta_metrics as {
        confidence_delta?: number;
        phenotype_agreement_delta?: number;
        similarity_score_delta?: number;
      } | null;

      if (!delta) continue;

      totalComparisons++;

      // Count overall improvement/regression
      const hasImprovement = 
        (delta.confidence_delta && delta.confidence_delta > 0.05) ||
        (delta.phenotype_agreement_delta && delta.phenotype_agreement_delta > 0.05) ||
        (delta.similarity_score_delta && delta.similarity_score_delta > 0.05);

      const hasRegression =
        (delta.confidence_delta && delta.confidence_delta < -0.05) ||
        (delta.phenotype_agreement_delta && delta.phenotype_agreement_delta < -0.05) ||
        (delta.similarity_score_delta && delta.similarity_score_delta < -0.05);

      if (hasImprovement && !hasRegression) {
        shadowBetter++;
      } else if (hasRegression && !hasImprovement) {
        shadowWorse++;
      } else {
        neutral++;
      }

      // Count per-metric improvements/regressions
      if (delta.confidence_delta !== undefined) {
        if (delta.confidence_delta > 0.05) {
          metricCounts.confidence_alignment.improved++;
        } else if (delta.confidence_delta < -0.05) {
          metricCounts.confidence_alignment.regressed++;
        } else {
          metricCounts.confidence_alignment.neutral++;
        }
      }

      if (delta.phenotype_agreement_delta !== undefined) {
        if (delta.phenotype_agreement_delta > 0.05) {
          metricCounts.phenotype_agreement.improved++;
        } else if (delta.phenotype_agreement_delta < -0.05) {
          metricCounts.phenotype_agreement.regressed++;
        } else {
          metricCounts.phenotype_agreement.neutral++;
        }
      }

      if (delta.similarity_score_delta !== undefined) {
        if (delta.similarity_score_delta > 0.05) {
          metricCounts.similarity_score.improved++;
        } else if (delta.similarity_score_delta < -0.05) {
          metricCounts.similarity_score.regressed++;
        } else {
          metricCounts.similarity_score.neutral++;
        }
      }
    }

    // Calculate rates
    const shadowBetterRate = totalComparisons > 0 
      ? shadowBetter / totalComparisons 
      : 0;
    const shadowWorseRate = totalComparisons > 0 
      ? shadowWorse / totalComparisons 
      : 0;
    const neutralRate = totalComparisons > 0 
      ? neutral / totalComparisons 
      : 0;

    // Calculate regression rates per metric
    const confidenceRegressionRate = totalComparisons > 0
      ? metricCounts.confidence_alignment.regressed / totalComparisons
      : 0;
    const phenotypeRegressionRate = totalComparisons > 0
      ? metricCounts.phenotype_agreement.regressed / totalComparisons
      : 0;
    const similarityRegressionRate = totalComparisons > 0
      ? metricCounts.similarity_score.regressed / totalComparisons
      : 0;

    // Determine recommendation
    let recommendationStatus: 'not_ready' | 'borderline' | 'ready' = 'not_ready';
    let recommendationReason = '';

    if (shadowBetterRate > 0.65 && 
        confidenceRegressionRate <= 0.15 && 
        phenotypeRegressionRate <= 0.15 && 
        similarityRegressionRate <= 0.15) {
      recommendationStatus = 'ready';
      recommendationReason = `Shadow model shows ${(shadowBetterRate * 100).toFixed(1)}% improvement rate with minimal regressions.`;
    } else if (shadowBetterRate > 0.45 || shadowWorseRate < 0.3) {
      recommendationStatus = 'borderline';
      recommendationReason = `Mixed results: ${(shadowBetterRate * 100).toFixed(1)}% better, ${(shadowWorseRate * 100).toFixed(1)}% worse. Requires review.`;
    } else {
      recommendationStatus = 'not_ready';
      recommendationReason = `Shadow model does not meet promotion criteria. Better rate: ${(shadowBetterRate * 100).toFixed(1)}%, Worse rate: ${(shadowWorseRate * 100).toFixed(1)}%.`;
    }

    return NextResponse.json({
      overall: {
        total_comparisons: totalComparisons,
        shadow_better_rate: parseFloat(shadowBetterRate.toFixed(4)),
        shadow_worse_rate: parseFloat(shadowWorseRate.toFixed(4)),
        neutral_rate: parseFloat(neutralRate.toFixed(4)),
      },
      by_metric: metricCounts,
      recommendation: {
        status: recommendationStatus,
        reason: recommendationReason,
      },
    });

  } catch (error: unknown) {
    console.error('[api/internal/model/readiness] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === 'Admin access required' ? 403 : 500 }
    );
  }
}

