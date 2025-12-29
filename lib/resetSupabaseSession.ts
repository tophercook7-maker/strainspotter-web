"use client";

import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export async function resetSupabaseSession() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  console.log("🔄 Supabase session reset");
}

