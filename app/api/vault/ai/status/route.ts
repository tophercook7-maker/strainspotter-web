/**
 * GET /api/vault/ai/status
 * Get AI system status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    const embeddingServerUrl = process.env.EMBEDDING_SERVER_URL || 'http://localhost:7001';
    
    let embeddingStatus = 'offline';
    let embeddingLatency: number | undefined;

    return NextResponse.json(
      { error: 'AI status not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Get AI status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI status' },
      { status: 500 }
    );
  }
}
