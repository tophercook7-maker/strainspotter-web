import { serve } from "./std/server";
import { getSupabaseClient } from '../../_shared/supabaseClient.ts';

// Helper to get env vars
function getEnv(key: string, fallback = ''): string {
  return Deno.env.get(key) || fallback;
}

const supabase = getSupabaseClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_ANON_KEY')
);

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Auth: get user from JWT
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  let userId = null;
  if (jwt) {
    const { data: user } = await supabase.auth.getUser(jwt);
    userId = user?.user?.id || null;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Query scans for user
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(JSON.stringify({ scans: data }), {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
});
