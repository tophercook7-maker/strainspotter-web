"use client";

// Import reset function - it runs at module load time
import "@/lib/resetSupabaseStorage";
import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get the single Supabase browser client
 * Storage is reset at module load time before this can be called
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,      // Disable persistence - prevent auto-restore of corrupted sessions
          autoRefreshToken: false,    // Disable auto-refresh - prevent token operations on startup
          detectSessionInUrl: false, // Disable URL detection - prevent session restore from URL
        },
      }
    );
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
