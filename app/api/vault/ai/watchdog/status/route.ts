/**
 * GET /api/vault/ai/watchdog/status
 * Get watchdog status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Watchdog operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get watchdog status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get watchdog status' },
      { status: 500 }
    );
  }
}
