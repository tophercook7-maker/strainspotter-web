/**
 * GET /api/vault/files/list
 * List directory contents
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';

    return NextResponse.json(
      { error: 'Vault file operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
