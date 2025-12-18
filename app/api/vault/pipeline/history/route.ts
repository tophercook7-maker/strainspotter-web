/**
 * GET /api/vault/pipeline/history
 * Get pipeline job history
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    return NextResponse.json(
      { error: 'Pipeline operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get pipeline history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get history' },
      { status: 500 }
    );
  }
}
