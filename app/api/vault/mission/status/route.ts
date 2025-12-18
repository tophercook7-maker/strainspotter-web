/**
 * GET /api/vault/mission/status
 * Get comprehensive system status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Mission status not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get mission status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
