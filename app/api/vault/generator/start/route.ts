/**
 * POST /api/vault/generator/start
 * Start synthetic image generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { strain, phenotypes, lighting, photographyStyles, count } = body;

    if (!strain) {
      return NextResponse.json({ error: 'strain is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Generator operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Start generator error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start generation' },
      { status: 500 }
    );
  }
}
