// lib/supabase/server.ts
// Server-side Supabase client for Server Actions and API routes

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client.
 * Returns null when env vars are missing (safe for build; callers must handle null at runtime).
 */
export function createServerClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createSupabaseClient(supabaseUrl, supabaseKey);
}
