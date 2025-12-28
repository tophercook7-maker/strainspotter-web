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

// Export as a Proxy that calls getSupabaseClient() on property access
// This maintains the same API while ensuring lazy initialization
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    // Handle special properties that shouldn't trigger client creation
    if (prop === 'then' || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
      return undefined;
    }
    
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    
    // If it's a function, bind it to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    // For non-function values, return as-is
    return value;
  }
});
