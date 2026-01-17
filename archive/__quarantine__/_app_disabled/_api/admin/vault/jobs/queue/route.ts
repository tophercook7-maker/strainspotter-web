import "server-only";
/**
 * GET /api/admin/vault/jobs/queue
 * Get queue status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Job queue not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get queue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue' },
      { status: 500 }
    );
  }
}
