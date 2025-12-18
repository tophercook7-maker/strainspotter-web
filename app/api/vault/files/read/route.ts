/**
 * GET /api/vault/files/read
 * Read file content (for previews)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Vault file access not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Read file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}
