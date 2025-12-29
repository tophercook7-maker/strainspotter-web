import "server-only";
/**
 * GET /api/scans
 * Return most recent scans for gallery
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { getUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    console.log('[scans] Fetching latest scans');

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get latest scans (limit 100)
    const { data, error } = await supabaseAdmin
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    console.log(`[scans] Returning ${data?.length || 0} scans`);
    return NextResponse.json({ scans: data || [] });
  } catch (error: any) {
    console.error('[scans] Error fetching scans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}
