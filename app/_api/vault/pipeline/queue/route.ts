import "server-only";
/**
 * GET /api/vault/pipeline/queue
 * Get pipeline queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Pipeline operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get pipeline queue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get queue' },
      { status: 500 }
    );
  }
}
