/**
 * POST /api/vault/notebook/save
 * Save notebook to vault
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: 'name and content are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Notebook operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Save notebook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save notebook' },
      { status: 500 }
    );
  }
}
