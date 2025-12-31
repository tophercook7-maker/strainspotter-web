'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RootGate() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return

      if (data.session) {
        router.replace('/garden')
      } else {
        router.replace('/login')
      }

      setChecked(true)
    })

    return () => {
      alive = false
    }
  }, [router])

  if (!checked) {
    return (
      <main>
        <h2>Loading…</h2>
      </main>
    )
  }

  return null
}
