import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { requireAdminAPI } from '@/lib/adminAuth';

/**
 * GET /api/internal/trends/confidence
 * Internal admin-only endpoint for confidence trend aggregation
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

    // Get confidence signals from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: signals, error: signalsError } = await supabaseAdmin
      .from('scan_confidence_signals')
      .select('image_quality, generated_confidence, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (signalsError) {
      console.error('[internal/trends/confidence] Error fetching signals:', signalsError);
      return NextResponse.json(
        { error: 'Failed to fetch confidence signals' },
        { status: 500 }
      );
    }

    // Aggregate time series (daily averages)
    const timeSeriesMap = new Map<string, { sum: number; count: number }>();
    
    signals?.forEach(signal => {
      if (signal.generated_confidence !== null && signal.generated_confidence !== undefined) {
        const date = new Date(signal.created_at).toISOString().split('T')[0];
        const existing = timeSeriesMap.get(date) || { sum: 0, count: 0 };
        timeSeriesMap.set(date, {
          sum: existing.sum + signal.generated_confidence,
          count: existing.count + 1,
        });
      }
    });

    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => ({
        date,
        avg_confidence: data.count > 0 ? data.sum / data.count : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate by image quality
    const byImageQuality: Record<string, number> = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
    };

    signals?.forEach(signal => {
      if (signal.image_quality && signal.generated_confidence !== null) {
        const quality = signal.image_quality.toLowerCase();
        if (quality in byImageQuality) {
          byImageQuality[quality] += signal.generated_confidence;
        }
      }
    });

    // Calculate averages for each quality level
    const qualityCounts: Record<string, number> = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0,
    };

    signals?.forEach(signal => {
      if (signal.image_quality) {
        const quality = signal.image_quality.toLowerCase();
        if (quality in qualityCounts) {
          qualityCounts[quality]++;
        }
      }
    });

    Object.keys(byImageQuality).forEach(quality => {
      if (qualityCounts[quality] > 0) {
        byImageQuality[quality] = byImageQuality[quality] / qualityCounts[quality];
      }
    });

    return NextResponse.json({
      time_series: timeSeries,
      by_image_quality: byImageQuality,
    });
  } catch (error: unknown) {
    console.error('[internal/trends/confidence] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

