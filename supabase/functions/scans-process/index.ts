import { serve } from "std/server";
// Supabase Edge Functions: use runtime config for env vars
import { supabase } from './_shared.ts';

const ALLOW_ORIGINS = [
  'https://strainspotter.app',
  'https://www.strainspotter.app',
  'https://*.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function corsHeaders(origin: string | null) {
  try {
    const allowed = !!origin && (ALLOW_ORIGINS.includes(origin) || /\.vercel\.app$/.test(new URL(origin).host));
    return {
      'Access-Control-Allow-Origin': allowed ? origin : '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin'
    } as Record<string, string>;
  } catch {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin'
    };
  }
}

async function parseJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin) };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers });

  const body = await parseJson(req);
  if (!body || (!body.id && !body.image_url && !body.base64)) {
    return new Response(JSON.stringify({ error: 'id or image_url or base64 required' }), { status: 400, headers });
  }

  // Load Google Vision API key
  // Supabase Edge Functions: get env vars from runtime config
  // @ts-ignore
  const VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY') || Deno.env.get('VISION_API_KEY') || '';
  const VISION_ENDPOINT = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
  if (!VISION_API_KEY) {
    return new Response(JSON.stringify({ error: 'GOOGLE_VISION_API_KEY not set' }), { status: 500, headers });
  }

  try {
    // If only id provided, fetch image_url from DB
    let imageUrl = body.image_url as string | undefined;
    let contentB64 = body.base64 as string | undefined;

    if (!imageUrl && !contentB64 && body.id) {
      const { data, error } = await supabase.from('scans').select('image_url').eq('id', body.id).maybeSingle();
      if (error) throw new Error(error.message);
      imageUrl = data?.image_url || undefined;
    }

    const image = contentB64 ? { content: contentB64 } : { source: { imageUri: imageUrl } };

    const requestPayload = {
      requests: [
        {
          image,
          features: [
            { type: 'TEXT_DETECTION' },
            { type: 'WEB_DETECTION' },
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'LOGO_DETECTION' }
          ]
        }
      ]
    };

    const resp = await fetch(VISION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Vision error ${resp.status}`, details: t }), { status: 500, headers });
    }

    const data = await resp.json();
    const result = data?.responses?.[0] || {};

    // Update scans row if id is known
    if (body.id) {
      await supabase.from('scans').update({ result, status: 'complete', processed_at: new Date().toISOString() }).eq('id', body.id);
    }

    return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
});
