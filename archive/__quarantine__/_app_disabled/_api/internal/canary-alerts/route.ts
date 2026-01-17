/**
 * Canary Alerts API
 * Admin-only, read-only access to canary alerts
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

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
    const severity = req.nextUrl.searchParams.get('severity');

    let query = supabaseAdmin
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity && (severity === 'info' || severity === 'warning')) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('[canary-alerts] Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === 'Admin access required' ? 403 : 500 }
    );
  }
}

