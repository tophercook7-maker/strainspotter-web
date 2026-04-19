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

  // Query growers listed in directory with minimum experience
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      user_id,
      grower_farm_name,
      grower_city,
      grower_state,
      grower_country,
      grower_specialties,
      grower_bio,
      grower_experience_years,
      grower_license_status,
      grower_certified,
      grower_accepts_messages,
      grower_listed_in_directory,
      grower_last_active
    `)
    .eq('is_grower', true)
    .eq('grower_listed_in_directory', true)
    .gte('grower_experience_years', 3)
    .order('grower_last_active', { ascending: false })
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
