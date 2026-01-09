import "server-only";
/**
 * GET /api/reports/[scan_id]
 * Fetch AI report for a scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { getUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  try {
    const { scan_id } = await params;
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the scan
    const { data: scan, error: scanError } = await supabaseAdmin
      .from('scans')
      .select('user_id')
      .eq('id', scan_id)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // Check ownership (allow if scan has no user_id or matches current user)
    if (scan.user_id && scan.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('report_json, confidence_score, generated_at')
      .eq('scan_id', scan_id)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        // Report not found - return 404 (not an error)
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
      throw reportError;
    }

    return NextResponse.json({
      report_json: report.report_json,
      confidence_score: report.confidence_score,
      generated_at: report.generated_at,
    });
  } catch (error: unknown) {
    console.error('[reports] Error fetching report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

