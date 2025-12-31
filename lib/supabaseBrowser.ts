import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/cleanEnv";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !rawKey) {
  throw new Error('Supabase environment variables not configured');
}

// Clean env vars to remove invisible Unicode characters
const SUPABASE_URL = cleanEnv(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = cleanEnv(rawKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

/**
 * Create a Supabase client with configurable session persistence
 * 
 * @param persistSession - If true, uses localStorage (remembers across sessions)
 *                        If false, uses sessionStorage (forgets on close)
 */
export function createSupabaseClient(persistSession: boolean) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession, // 🔐 REMEMBER ME CONTROL
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Singleton instance for backward compatibility
// Uses Supabase defaults (persistSession: true by default, but not hardcoded)
let browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Get the default Supabase browser client (singleton pattern)
 * Uses Supabase default behavior (persistSession: true by default)
 * For login with "Remember Me", use createSupabaseClient(remember) instead
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    // Use Supabase defaults - no hardcoded persistence
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}

// Mock user for protected pages (temporary)
export const MOCK_USER = {
  id: 'mock-user-id-temp',
  email: 'mock@strainspotter.app',
  user_metadata: {},
  app_metadata: {},
};
