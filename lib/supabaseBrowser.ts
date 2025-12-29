"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

/**
 * Get the single Supabase browser client
 * 
 * CRITICAL: Supabase does NOT manage auth state.
 * - persistSession: false - No localStorage/sessionStorage persistence
 * - autoRefreshToken: false - No automatic token refresh
 * - detectSessionInUrl: false - No URL-based session detection
 * 
 * Auth state is managed in React only.
 * This prevents non-ISO-8859-1 Authorization header crashes.
 */
export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not configured');
    }

    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
}

// Mock user for protected pages (temporary)
export const MOCK_USER = {
  id: 'mock-user-id-temp',
  email: 'mock@strainspotter.app',
  user_metadata: {},
  app_metadata: {},
};
