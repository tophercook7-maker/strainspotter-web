/**
 * POST /api/admin/dataset/manifest
 * Trigger manifest build for a strain
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
    console.error('Manifest trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger manifest build' },
      { status: 500 }
    );
  }
}
