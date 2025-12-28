"use client";

import { createBrowserClient } from '@supabase/ssr';

// Use environment variables with fallback to real Supabase credentials
const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://rdqpxixsbqcsyfewcmbz.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXB4aXhzYnFjc3lmZXdjbWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI3NTMsImV4cCI6MjA3NTY5ODc1M30.rTbYZNKNv1szvzjA2D828OVt7qUZVSXgi4G_tUqm3mA';

// Log configuration for debugging
if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
  console.log('[SUPABASE CLIENT] URL:', supabaseUrl?.substring(0, 30) + '...');
  console.log('[SUPABASE CLIENT] Key present:', !!supabaseAnonKey);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[SUPABASE CLIENT] Using fallback URL (env var not set)');
  }
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
