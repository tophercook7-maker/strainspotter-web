// lib/supabase/server.ts
// Server-side Supabase client for Server Actions and API routes

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer service role key for server-side operations, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a server-side Supabase client.
 * Safe to use in Server Actions, API routes, and server components.
 * Does NOT rely on window or browser APIs.
 */
export function createServerClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or authentication key");
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey);
}
