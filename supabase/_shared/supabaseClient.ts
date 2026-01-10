import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey);
}
