// Shared Supabase client for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
// Supabase Edge Functions: use runtime config for env vars
// @ts-ignore
const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_URL'.toLowerCase()) || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
