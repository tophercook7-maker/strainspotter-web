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

  // Parse groupId from URL (e.g., /group-messages?id=123)
  const url = new URL(req.url);
  const groupId = url.searchParams.get('id');
  if (!groupId) {
    return new Response(JSON.stringify({ error: 'Missing group id' }), {
      status: 400,
      headers: allowCors(),
    });
  }

  if (req.method === 'GET') {
    // Query messages for group
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
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
  }

  if (req.method === 'POST') {
    // Auth required for posting
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
    const content = body.content || '';
    if (!content) {
      return new Response(JSON.stringify({ error: 'Missing content' }), {
        status: 400,
        headers: allowCors(),
      });
    }
    const { error: insertError } = await supabase
      .from('messages')
      .insert({ group_id: groupId, user_id: userId, content });
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
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: allowCors(),
  });
});
