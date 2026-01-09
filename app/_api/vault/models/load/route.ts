import "server-only";
/**
 * POST /api/vault/models/load
 * Load model into GPU server
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { model_id } = body;

    if (!model_id) {
      return NextResponse.json({ error: 'model_id is required' }, { status: 400 });
    }

    // In a real implementation, this would:
    // 1. Load model from disk
    // 2. Send to GPU server
    // 3. Update active model in config

    return NextResponse.json({
      success: true,
      message: 'Model load initiated (placeholder - implement GPU server integration)'
    });
  } catch (error: any) {
    console.error('Load model error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load model' },
      { status: 500 }
    );
  }
}
