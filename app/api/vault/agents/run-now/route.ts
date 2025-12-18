/**
 * POST /api/vault/agents/run-now
 * Manually trigger agent run
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();
    return NextResponse.json(
      { error: 'Vault agents not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Run agent error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run agent' },
      { status: 500 }
    );
  }
}
