import "server-only";
/**
 * POST /api/vault/pipeline/cancel
 * Cancel a pipeline job
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Pipeline operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Cancel pipeline job error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
