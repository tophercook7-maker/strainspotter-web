/**
 * GET /api/vault/files/recent
 * Get recently accessed files
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    return NextResponse.json(
      { error: 'Vault file operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get recent files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recent files' },
      { status: 500 }
    );
  }
}
