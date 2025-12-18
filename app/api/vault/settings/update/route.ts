/**
 * POST /api/vault/settings/update
 * Update vault settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const settings = body;

    // Validate settings
    if (!settings.vault_path || !settings.embedding_server_url) {
      return NextResponse.json(
        { error: 'vault_path and embedding_server_url are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Vault settings not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Update vault settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
