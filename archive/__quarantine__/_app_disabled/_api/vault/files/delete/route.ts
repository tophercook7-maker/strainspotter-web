import "server-only";
/**
 * DELETE /api/vault/files/delete
 * Delete file or directory
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Vault file operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
