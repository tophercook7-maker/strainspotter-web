/**
 * POST /api/vault/agents/start
 * Start agent manager
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
    console.error('Start agent manager error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start agent manager' },
      { status: 500 }
    );
  }
}
