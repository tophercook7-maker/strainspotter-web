"use client";

import { createBrowserClient } from '@supabase/ssr';

// Use environment variables - NO FALLBACKS (fail hard if missing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only throw error in browser/runtime, not during build time
// This allows Next.js to build the page, but will fail at runtime if env vars are missing
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "❌ Supabase environment variables missing. " +
      "Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  );
}

// Create client lazily - only throw error when actually used (runtime), not at module load (build time)
let client: ReturnType<typeof getSupabaseClient> | null = null;

// Export function for explicit client creation (useful for components that need to call it in useEffect)
export function getSupabaseBrowserClient() {
  if (!client) {
    client = getSupabaseClient();
  }
  return client;
}

export const supabase = new Proxy({} as ReturnType<typeof getSupabaseClient>, {
  get(_target, prop) {
    if (!client) {
      client = getSupabaseClient();
    }
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
