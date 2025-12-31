import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/cleanEnv';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !rawKey) {
  throw new Error('Supabase environment variables not configured');
}

// Clean env vars to remove invisible Unicode characters
const SUPABASE_URL = cleanEnv(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = cleanEnv(rawKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

let supabase: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client
 * Initializes once on first call
 */
export function getSupabaseClient() {
  if (!supabase && typeof window !== 'undefined') {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // 🖥️ desktop critical
        storage: window.localStorage,
      },
    });
  }
  if (!supabase) {
    throw new Error('Supabase client not available (server-side or not initialized)');
  }
  return supabase;
}

/**
 * Alias for backward compatibility
 * Uses the same singleton instance
 */
export function getSupabaseBrowserClient() {
  return getSupabaseClient();
}

