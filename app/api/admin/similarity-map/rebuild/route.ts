/**
 * POST /api/admin/similarity-map/rebuild
 * Rebuild similarity map
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
    console.error('Rebuild error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rebuild map' },
      { status: 500 }
    );
  }
}
