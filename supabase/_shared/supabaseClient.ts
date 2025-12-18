// Shared Supabase client for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey);
}
