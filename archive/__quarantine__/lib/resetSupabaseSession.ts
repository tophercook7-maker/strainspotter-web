"use client";

import { supabase } from "@/lib/supabaseClient";

export async function resetSupabaseSession() {
  await supabase.auth.signOut();
  localStorage.clear();
  sessionStorage.clear();
  console.log("🔄 Supabase session reset");
}

