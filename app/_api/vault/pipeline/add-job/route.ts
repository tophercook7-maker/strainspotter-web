import "server-only";
/**
 * POST /api/vault/pipeline/add-job
 * Add job to pipeline queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { type, strain, payload } = body;

    if (!type || !strain) {
      return NextResponse.json(
        { error: 'type and strain are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Pipeline operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Add pipeline job error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add job' },
      { status: 500 }
    );
  }
}
