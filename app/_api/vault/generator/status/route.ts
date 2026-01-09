import "server-only";
/**
 * GET /api/vault/generator/status
 * Get generator status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Generator operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get generator status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get generator status' },
      { status: 500 }
    );
  }
}
