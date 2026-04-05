// lib/supabase/client.ts
// Browser-side Supabase client for auth and data access
// Uses the public anon key — safe to expose, RLS handles security

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Singleton browser client
let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client that won't crash but won't work
    // This lets the app build even before the anon key is set
    console.warn("Supabase not configured — auth features disabled");
    return createClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder"
    );
  }

  if (typeof window === "undefined") {
    // Server-side — create fresh client each time
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
