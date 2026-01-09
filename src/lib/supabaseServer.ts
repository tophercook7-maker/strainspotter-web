import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function getSupabaseServerClient() {
  const cookieStore = cookies()

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service) {
    throw new Error("Supabase server env vars missing")
  }

  return createClient(url, service, {
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${service}`
      }
    }
  })
}

