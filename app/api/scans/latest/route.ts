/**
 * GET /api/scans/latest
 * Get the most recent scan for the current user
 * Used by Grow Coach to reference recent scan results
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { getUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id') || user.id;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Get most recent scan for user
    const { data, error } = await supabaseAdmin
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No scans found
        return NextResponse.json({ scan: null });
      }
      throw error;
    }

    // Extract enrichment from match or directly
    const enrichment = data.enrichment || data.match?.enrichment;
    const match = data.match?.match || data.match_result?.match;

    const scanForCoach = {
      scan_id: data.id,
      scan_type: data.scan_type || 'id',
      created_at: data.created_at,
      enrichment,
      match: match ? {
        name: match.name,
        slug: match.slug,
        confidence: match.confidence,
      } : null,
    };

    return NextResponse.json({ scan: scanForCoach });
  } catch (error: any) {
    console.error('[scans/latest] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch latest scan' },
      { status: 500 }
    );
  }
}
