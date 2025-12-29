import "server-only";
/**
 * POST /api/vault/ai/watchdog/autorestart
 * Toggle auto-restart
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { enabled } = body;

    return NextResponse.json(
      { error: 'Watchdog operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Set auto-restart error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set auto-restart' },
      { status: 500 }
    );
  }
}
