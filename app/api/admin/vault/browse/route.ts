/**
 * GET /api/admin/vault/browse
 * Browse vault directory structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';

    return NextResponse.json(
      { error: 'Vault browsing not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Browse vault error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to browse vault' },
      { status: 500 }
    );
  }
}
