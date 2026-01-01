'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return

      if (!data.user) {
        // 🔒 hard guard: unauthenticated users never see garden
        window.location.pathname = '/login'
        return
      }

      setEmail(data.user.email ?? null)
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <main>
        <h2>Loading Garden…</h2>
      </main>
    )
  }

  return (
    <main>
      <h1>Garden</h1>
      <p>Welcome {email}</p>

      {/* 🌱 RESTORED GARDEN CONTENT AREA */}
      <section style={{ marginTop: 32 }}>
        <h3>Your Garden</h3>
        <p>This is where your strains, scans, and saved items live.</p>

        {/* PLACEHOLDERS FOR YOUR EXISTING FEATURES */}
        <ul>
          <li>Saved Strains</li>
          <li>Recent Scans</li>
          <li>Favorites</li>
          <li>History</li>
        </ul>
      </section>
    </main>
  )
}
