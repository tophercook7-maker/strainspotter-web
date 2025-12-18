/**
 * POST /api/admin/auto-grow/run
 * Trigger auto-grow for all incomplete strains
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();
    return NextResponse.json(
      { error: 'Auto-grow feature not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Auto-grow error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run auto-grow' },
      { status: 500 }
    );
  }
}
