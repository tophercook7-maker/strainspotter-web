'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setLoading(false)
    })
  }, [])

  return (
    <main>
      {loading && <p>Loading garden…</p>}

      {!loading && email && (
        <>
          <h2>Garden</h2>
          <p>Welcome {email}</p>
        </>
      )}

      {!loading && !email && (
        <>
          <h2>Garden</h2>
          <p>No session found.</p>
        </>
      )}
    </main>
  )
}
