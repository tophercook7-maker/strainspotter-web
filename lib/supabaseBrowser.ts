import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/cleanEnv";

// Single singleton instance
let browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Get the single Supabase browser client (singleton pattern)
 * 
 * Session persistence is controlled per-login via the persistSession option
 * in signInWithPassword() calls.
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!rawUrl || !rawKey) {
      throw new Error('Supabase environment variables not configured');
    }

    // Clean env vars to remove invisible Unicode characters
    const supabaseUrl = cleanEnv(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = cleanEnv(rawKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

    browserClient = createClient(supabaseUrl, supabaseAnonKey);
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
