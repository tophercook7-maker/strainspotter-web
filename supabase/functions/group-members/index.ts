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

  // Parse groupId from URL (e.g., /group-members?id=123)
  const url = new URL(req.url);
  const groupId = url.searchParams.get('id');
  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Missing group id' }), {
      status: 400,
      headers: allowCors(),
    });
  }

  // Query members for group
  const { data, error } = await supabase
    .from('thread_members')
    .select('*, users(username)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

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
