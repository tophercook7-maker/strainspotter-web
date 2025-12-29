import "server-only";
/**
 * POST /api/vault/ai/watchdog/start
 * Start watchdog
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
    console.error('Start watchdog error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start watchdog' },
      { status: 500 }
    );
  }
}
