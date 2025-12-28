"use client";

import { createBrowserClient } from '@supabase/ssr';

// Use environment variables - NO FALLBACKS (fail hard if missing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create client lazily - only throw error when actually used (runtime), not at module load (build time)
let client: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseClient() {
  // Only create client in browser environment (not during SSR/build)
  if (typeof window === 'undefined') {
    // During SSR/build, return a mock client that won't be used
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({ select: () => ({ data: null, error: null }) }),
    } as any;
  }

  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables missing. " +
        "Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    client = createBrowserClient(
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
  
  return client;
}

// Export function for explicit client creation (useful for components that need to call it in useEffect)
export function getSupabaseBrowserClient() {
  return getSupabaseClient();
}

// Export client directly without Proxy - create it only in browser
// Use a simple getter pattern to avoid Proxy interference with fetch
let _supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

// Create a simple object with getters that lazily initialize
// This avoids Proxy entirely which may be causing fetch header issues
const supabaseWrapper = {
  get auth() {
    if (typeof window === 'undefined') {
      return {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      };
    }
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    return _supabaseInstance.auth;
  },
  get from() {
    if (typeof window === 'undefined') {
      return () => ({ select: () => ({ data: null, error: null }) });
    }
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    return _supabaseInstance.from;
  },
};

// Export with type assertion - this is safe because we're just forwarding to the real client
export const supabase = supabaseWrapper as ReturnType<typeof createBrowserClient>;
