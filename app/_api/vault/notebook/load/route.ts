import "server-only";
/**
 * GET /api/vault/notebook/load
 * Load notebook from vault
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    return NextResponse.json(
      { error: 'Notebook operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Load notebook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load notebook' },
      { status: 500 }
    );
  }
}
