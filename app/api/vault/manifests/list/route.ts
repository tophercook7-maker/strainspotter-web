import "server-only";
/**
 * GET /api/vault/manifests/list
 * List all manifests
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Manifest operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('List manifests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list manifests' },
      { status: 500 }
    );
  }
}
