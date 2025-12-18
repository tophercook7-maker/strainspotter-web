/**
 * GET /api/scans/[scan_id]
 * Return scan details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScan } from '@/app/api/_utils/supabaseAdmin';
import { getUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const { scan_id } = await params;
    console.log(`[scans] Fetching scan: ${scan_id}`);

    const scan = await getScan(scan_id);

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Support both new and legacy field names for compatibility
    const response = {
      ...scan,
      vision_results: scan.vision || scan.vision_results,
      match_result: scan.match || scan.match_result,
    };

    return NextResponse.json({ scan: response });
  } catch (error: any) {
    console.error('[scans] Error fetching scan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}

