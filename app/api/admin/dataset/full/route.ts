/**
 * POST /api/admin/dataset/full
 * Trigger full pipeline for a strain or all strains
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
    console.error('Full pipeline trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger full pipeline' },
      { status: 500 }
    );
  }
}
