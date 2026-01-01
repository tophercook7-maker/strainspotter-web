'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function GardenPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.pathname = '/login'
        return
      }
      setEmail(data.user.email ?? null)
      setLoading(false)
    })
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

      {/* ===== ACTION BUTTONS ===== */}
      <section style={{ marginTop: 32 }}>
        <h3>Actions</h3>

        <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
          <Link href="/scan">
            <button>📸 Scan a Strain</button>
          </Link>

          <Link href="/saved">
            <button>🌱 Saved Strains</button>
          </Link>

          <Link href="/history">
            <button>🕓 Scan History</button>
          </Link>

          <Link href="/favorites">
            <button>⭐ Favorites</button>
          </Link>

          <Link href="/account">
            <button>⚙️ Account Settings</button>
          </Link>
        </div>
      </section>

      {/* ===== LOGOUT ===== */}
      <section style={{ marginTop: 48 }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.pathname = '/login'
          }}
        >
          🚪 Log Out
        </button>
      </section>
    </main>
  )
}
