/**
 * POST /api/vault/remote/stop
 * Stop remote desktop session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    // In a real implementation, this would:
    // 1. Stop gstreamer screen capture
    // 2. Close WebRTC connections
    // 3. Clean up resources

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Stop remote desktop error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stop remote desktop' },
      { status: 500 }
    );
  }
}
