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

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: allowCors(),
    });
  }

  // Auth required
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
      headers: allowCors(),
    });
  }
  const body = await req.json();
  const groupId = body.group_id;
  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Missing group id' }), {
      status: 400,
      headers: allowCors(),
    });
  }
  // Insert member
  const { error: insertError } = await supabase
    .from('thread_members')
    .insert({ group_id: groupId, user_id: userId });
  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: allowCors(),
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 201,
    headers: allowCors(),
  });
});
