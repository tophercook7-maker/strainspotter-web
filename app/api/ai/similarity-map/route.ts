/**
 * GET /api/ai/similarity-map
 * Get similarity map data
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Try Supabase Storage first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.storage
          .from('ai')
          .download('similarity-map.json');

        if (!error && data) {
          const text = await data.text();
          return NextResponse.json(JSON.parse(text));
        }
      } catch (err) {
        // Fall through to local file
      }
    }

    // Fallback: local file
    const mapPath = join(process.cwd(), 'datasets', 'similarity-map.json');
    if (existsSync(mapPath)) {
      const content = await readFile(mapPath, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    }

    return NextResponse.json(
      { error: 'Similarity map not found. Run buildMap.js first.' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Get similarity map error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load map' },
      { status: 500 }
    );
  }
}
