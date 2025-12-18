/**
 * GET /api/vault/mission/events
 * Get recent system events
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    return NextResponse.json(
      { error: 'Mission events not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get mission events error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get events' },
      { status: 500 }
    );
  }
}
