"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseSafeFetch } from "@/lib/supabaseSafeFetch";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    // Temporarily override global fetch during client creation
    const originalFetch = globalThis.fetch;
    globalThis.fetch = supabaseSafeFetch as typeof fetch;
    
    try {
      browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    } finally {
      // Restore original fetch after client creation
      globalThis.fetch = originalFetch;
    }
  }
  return browserClient;
}

// Export a default instance for backward compatibility
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient();
    return (client as any)[prop];
  }
});
