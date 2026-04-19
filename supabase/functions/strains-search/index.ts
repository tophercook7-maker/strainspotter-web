import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { allowCors } from '../scans-history/_shared.ts';

function getEnv(key: string, fallback = ''): string {
  return Deno.env.get(key) || fallback;
}

const supabase = createClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_ANON_KEY')
);

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: allowCors(),
    });
  }

  // Parse query
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const limit = Number(url.searchParams.get('limit') || 5);
  if (!q) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: allowCors(),
    });
  }

  // Search strains by name (ilike)
  const { data, error } = await supabase
    .from('strains')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('popularity', { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: allowCors(),
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: allowCors(),
  });
});
