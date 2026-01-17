import "server-only";
/**
 * POST /api/vault/remote/key
 * Send keyboard input to remote desktop
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { key } = body;

    // In a real implementation, this would send the key to the remote desktop session
    // For now, return success

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error('Send remote key error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send key' },
      { status: 500 }
    );
  }
}
