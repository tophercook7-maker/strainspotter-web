"use client";

import { createBrowserClient } from "@supabase/ssr";
import { resetSupabaseStorage } from "@/lib/resetSupabaseStorage";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let storageReset = false;

export function getSupabaseBrowserClient() {
  // Reset storage ONCE before first client creation
  if (!storageReset && typeof window !== "undefined") {
    resetSupabaseStorage();
    storageReset = true;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
