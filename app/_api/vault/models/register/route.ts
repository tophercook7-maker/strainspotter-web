import "server-only";
/**
 * POST /api/vault/models/register
 * Register a new model
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { name, version, embedding_dim, type, model_path, metadata } = body;

    if (!name || !version || !embedding_dim || !type) {
      return NextResponse.json(
        { error: 'name, version, embedding_dim, and type are required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'build-skip' }, { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase
      .from('model_registry')
      .insert({
        name,
        version,
        embedding_dim,
        type,
        model_path,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, model: data });
  } catch (error: any) {
    console.error('Register model error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register model' },
      { status: 500 }
    );
  }
}
