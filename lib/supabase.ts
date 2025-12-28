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

// Export client directly without Proxy to avoid interfering with Supabase's internal fetch
// Initialize lazily on first property access using a getter
let _supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

const supabaseObject = {
  get auth() {
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    return _supabaseInstance.auth;
  },
  get from() {
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    return _supabaseInstance.from;
  },
};

// Create a Proxy that forwards all property access to the actual client
// but only creates the client when needed
export const supabase = new Proxy(supabaseObject, {
  get(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    const value = (_supabaseInstance as any)[prop];
    // Don't bind functions - return them as-is to avoid interfering with internal mechanisms
    return value;
  },
  has(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient();
    }
    return prop in _supabaseInstance;
  }
}) as ReturnType<typeof createBrowserClient>;
