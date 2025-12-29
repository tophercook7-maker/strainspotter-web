import "server-only";
/**
 * GET /api/admin/vault/scraper/jobs
 * Get scraper jobs from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin not initialized' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('scraper_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      jobs: data || []
    });
  } catch (error: any) {
    console.error('Get scraper jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get jobs' },
      { status: 500 }
    );
  }
}
