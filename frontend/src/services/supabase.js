import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rdqpxixsbqcsyfewcmbz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXB4aXhzYnFjc3lmZXdjbWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI3NTMsImV4cCI6MjA3NTY5ODc1M30.rTbYZNKNv1szvzjA2D828OVt7qUZVSXgi4G_tUqm3mA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Missing Supabase environment variables - using defaults');
}

// Browser client with auth persistence DISABLED
// 
// CRITICAL: Supabase does NOT manage auth state.
// - persistSession: false - No localStorage/sessionStorage persistence
// - autoRefreshToken: false - No automatic token refresh
// - detectSessionInUrl: false - No URL-based session detection
// 
// Auth state is managed in React only.
// This prevents non-ISO-8859-1 Authorization header crashes.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {},
  },
});

