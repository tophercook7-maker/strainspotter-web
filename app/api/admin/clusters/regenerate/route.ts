import "server-only";
/**
 * POST /api/admin/clusters/regenerate
 * Regenerate clusters for a strain
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();
    return NextResponse.json(
      { error: 'Data pipeline not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Regenerate clusters error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate clusters' },
      { status: 500 }
    );
  }
}
