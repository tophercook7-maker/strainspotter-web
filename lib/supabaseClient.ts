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

/**
 * Create a desktop-safe Supabase client
 * 
 * @param persistSession - If true, uses localStorage (remembers across sessions)
 *                        If false, uses sessionStorage (forgets on close)
 * 
 * WHY:
 * - detectSessionInUrl MUST be false (no OAuth redirect loop in desktop)
 * - explicit storage prevents Electron/Tauri quirks
 */
export function createDesktopSafeSupabaseClient(persistSession: boolean) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession,
      autoRefreshToken: true,
      detectSessionInUrl: false, // 🚫 critical for desktop
      storage: persistSession
        ? window.localStorage
        : window.sessionStorage,
    },
  });
}

// Re-export for backward compatibility
export { createSupabaseClient, getSupabaseBrowserClient } from './supabaseBrowser';

