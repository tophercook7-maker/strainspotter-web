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

  // Auth: get user from JWT (optional for public groups)
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  let userId = null;
  if (jwt) {
    const { data: user } = await supabase.auth.getUser(jwt);
    userId = user?.user?.id || null;
  }

  // Query all groups
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

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
