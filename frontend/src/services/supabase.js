import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rdqpxixsbqcsyfewcmbz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcXB4aXhzYnFjc3lmZXdjbWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjI3NTMsImV4cCI6MjA3NTY5ODc1M30.rTbYZNKNv1szvzjA2D828OVt7qUZVSXgi4G_tUqm3mA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Missing Supabase environment variables - using defaults');
}

// Browser client with auth persistence disabled to prevent corrupted session auto-restore
// All auth must be explicit per login - no auto-restore
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

