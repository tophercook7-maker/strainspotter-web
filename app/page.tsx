'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RootGate() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return

      if (data.session) {
        router.replace('/garden')
      } else {
        router.replace('/login')
      }

      setReady(true)
    })

    return () => {
      alive = false
    }
  }, [router])

  if (!ready) {
    return (
      <main>
        <h2>Loading…</h2>
      </main>
    )
  }

  return null
}
