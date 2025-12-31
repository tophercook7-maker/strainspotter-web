import { createClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/cleanEnv';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !rawKey) {
  throw new Error('Supabase environment variables not configured');
}

// Clean env vars to remove invisible Unicode characters
const SUPABASE_URL = cleanEnv(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = cleanEnv(rawKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

// ✅ SINGLE CLIENT — DO NOT DUPLICATE
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // desktop-safe
  },
});

