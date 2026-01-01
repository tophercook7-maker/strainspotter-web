'use client'

import { useEffect, useState } from 'react'
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
      <main style={{ padding: 32 }}>
        <h2>Loading Garden…</h2>
      </main>
    )
  }

  return (
    <main style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1>🌿 Garden</h1>
        <p style={{ opacity: 0.8 }}>Signed in as {email}</p>
      </header>

      {/* PRIMARY ACTION */}
      <section
        style={{
          border: '1px solid #1f3d1f',
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
          background: '#0f1f0f',
        }}
      >
        <h2>Scan a Strain</h2>
        <p>Identify strains, verify labels, and match results.</p>
        <button
          style={{ marginTop: 12 }}
          onClick={() => (window.location.pathname = '/scan')}
        >
          📸 Start Scan
        </button>
      </section>

      {/* GRID ACTIONS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <ActionCard
          title="Saved Strains"
          description="Your saved and verified strains"
          action={() => (window.location.pathname = '/saved')}
          icon="🌱"
        />

        <ActionCard
          title="Scan History"
          description="Past scans and results"
          action={() => (window.location.pathname = '/history')}
          icon="🕓"
        />

        <ActionCard
          title="Favorites"
          description="Starred strains and notes"
          action={() => (window.location.pathname = '/favorites')}
          icon="⭐"
        />

        <ActionCard
          title="Account"
          description="Profile, settings, and plan"
          action={() => (window.location.pathname = '/account')}
          icon="⚙️"
        />
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: 48 }}>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.pathname = '/login'
          }}
        >
          🚪 Log Out
        </button>
      </footer>
    </main>
  )
}

function ActionCard({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description: string
  action: () => void
  icon: string
}) {
  return (
    <div
      style={{
        border: '1px solid #1f3d1f',
        borderRadius: 12,
        padding: 20,
        background: '#0c180c',
      }}
    >
      <h3>
        {icon} {title}
      </h3>
      <p style={{ opacity: 0.8 }}>{description}</p>
      <button style={{ marginTop: 12 }} onClick={action}>
        Open
      </button>
    </div>
  )
}
