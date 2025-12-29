import "server-only";
/**
 * POST /api/vault/ai/watchdog/stop
 * Stop watchdog
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Watchdog operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Stop watchdog error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop watchdog' },
      { status: 500 }
    );
  }
}
