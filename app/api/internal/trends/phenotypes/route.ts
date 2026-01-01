import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { requireAdminAPI } from '@/lib/adminAuth';

/**
 * GET /api/internal/trends/phenotypes
 * Internal admin-only endpoint for phenotype trend aggregation
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

    // Get all phenotype trends
    const { data: trends, error: trendsError } = await supabaseAdmin
      .from('phenotype_trends')
      .select('phenotype_signature, occurrence_count, first_seen, last_seen')
      .order('occurrence_count', { ascending: false })
      .limit(100);

    if (trendsError) {
      console.error('[internal/trends/phenotypes] Error fetching trends:', trendsError);
      return NextResponse.json(
        { error: 'Failed to fetch phenotype trends' },
        { status: 500 }
      );
    }

    // Top signatures by occurrence count
    const topSignatures = (trends || [])
      .slice(0, 20)
      .map(trend => ({
        phenotype_signature: trend.phenotype_signature,
        occurrence_count: trend.occurrence_count,
        last_seen: trend.last_seen,
      }));

    // Emerging signatures (recent first_seen, growing occurrence_count)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const emergingSignatures = (trends || [])
      .filter(trend => {
        const firstSeen = new Date(trend.first_seen);
        return firstSeen >= sevenDaysAgo;
      })
      .map(trend => {
        // Calculate growth rate (occurrence_count / days since first seen)
        const daysSinceFirstSeen = Math.max(
          1,
          Math.floor((new Date().getTime() - new Date(trend.first_seen).getTime()) / (1000 * 60 * 60 * 24))
        );
        const growthRate = trend.occurrence_count / daysSinceFirstSeen;

        return {
          phenotype_signature: trend.phenotype_signature,
          growth_rate: growthRate,
        };
      })
      .sort((a, b) => b.growth_rate - a.growth_rate)
      .slice(0, 10);

    return NextResponse.json({
      top_signatures: topSignatures,
      emerging_signatures: emergingSignatures,
    });
  } catch (error: unknown) {
    console.error('[internal/trends/phenotypes] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

