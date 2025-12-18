/**
 * POST /api/vault/files/move
 * Move file or directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { source, dest } = body;

    if (!source || !dest) {
      return NextResponse.json(
        { error: 'source and dest are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Vault file operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Move file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move file' },
      { status: 500 }
    );
  }
}
