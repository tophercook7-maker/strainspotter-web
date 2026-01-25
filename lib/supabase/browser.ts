// lib/supabase/browser.ts
// Browser-safe Supabase client for client components

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a browser-safe Supabase client.
 * Safe to use in client components and browser contexts.
 */
export function createBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey);
}

/**
 * Browser client instance (singleton pattern).
 * Returns null if env vars are missing (fails gracefully).
 */
export const browserClient = (supabaseUrl && supabaseKey)
  ? createBrowserClient()
  : null;
