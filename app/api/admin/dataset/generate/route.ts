/**
 * POST /api/admin/dataset/generate
 * Trigger synthetic image generation for a strain
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
    console.error('Generate trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger generation' },
      { status: 500 }
    );
  }
}
