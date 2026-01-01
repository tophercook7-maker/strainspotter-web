'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    // Listen for auth state instead of checking immediately
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!alive) return

        if (!session) {
          router.replace('/login')
        } else {
          setReady(true)
        }
      }
    )

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  if (!ready) {
    return (
      <main>
        <h2>Loading…</h2>
      </main>
    )
  }

  return (
    <main>
      <h2>Garden</h2>
      <p>You are signed in.</p>
    </main>
  )
}
