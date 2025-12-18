/**
 * GET /api/admin/model/config - Get current matcher config
 * PUT /api/admin/model/config - Update matcher config
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    await requireAdminAPI();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin not initialized' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('matcher_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No config found, return defaults
        return NextResponse.json({
          version: 1,
          weight_phash: 0.25,
          weight_color: 0.20,
          weight_texture: 0.25,
          weight_embedding: 0.20,
          weight_label: 0.10
        });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get config' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { weight_phash, weight_color, weight_texture, weight_embedding, weight_label } = body;

    // Validate weights sum to ~1.0
    const sum = (weight_phash || 0) + (weight_color || 0) + (weight_texture || 0) + 
                (weight_embedding || 0) + (weight_label || 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      return NextResponse.json(
        { error: 'Weights must sum to 1.0' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin not initialized' },
        { status: 500 }
      );
    }

    // Get current config
    const { data: current } = await supabaseAdmin
      .from('matcher_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (current) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('matcher_config')
        .update({
          weight_phash,
          weight_color,
          weight_texture,
          weight_embedding,
          weight_label,
          updated_at: new Date().toISOString()
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('matcher_config')
        .insert({
          version: 1,
          weight_phash,
          weight_color,
          weight_texture,
          weight_embedding,
          weight_label
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update config' },
      { status: 500 }
    );
  }
}
