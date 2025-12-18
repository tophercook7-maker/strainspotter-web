/**
 * GET /api/vault/agents/status
 * Get agent manager status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();
    return NextResponse.json(
      { error: 'Vault agents not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get agent status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
