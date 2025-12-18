/**
 * POST /api/admin/vault/jobs/next
 * Start next job from queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Job operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Start next job error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start next job' },
      { status: 500 }
    );
  }
}
