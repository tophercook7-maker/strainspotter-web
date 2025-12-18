/**
 * GET /api/admin/vault/stats
 * Get vault statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    return NextResponse.json(
      { error: 'Vault stats not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get vault stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get vault stats' },
      { status: 500 }
    );
  }
}
