"use client";

import { createBrowserClient } from '@supabase/ssr';

// Use environment variables - NO FALLBACKS (fail hard if missing)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Supabase environment variables missing. " +
    "Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Log configuration for debugging
if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
  console.log('[SUPABASE CLIENT] URL:', supabaseUrl.substring(0, 30) + '...');
  console.log('[SUPABASE CLIENT] Key present:', !!supabaseAnonKey);
}

// Create Supabase client for browser with SSR cookie support
// createBrowserClient is correct for Next.js App Router
// NO PLACEHOLDER VALUES - must use real env vars
export const supabase = createBrowserClient(
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
