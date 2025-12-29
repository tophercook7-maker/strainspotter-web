"use client"

import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createClient> | null = null

function sanitizeToken(token?: string | null) {
  if (!token) return undefined;
  // Remove all non-ASCII chars (browser fetch requirement)
  return token.replace(/[^ -~]/g, "");
}

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    throw new Error("Supabase browser env vars missing")
  }

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
    // 🚫 NO global.fetch
    // 🚫 NO headers
  })

  return browserClient
}

