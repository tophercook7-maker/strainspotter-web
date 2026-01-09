import "server-only";
/**
 * POST /api/vault/terminal/execute
 * Execute terminal command
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Terminal operations not available in web repo' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Execute terminal command error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
