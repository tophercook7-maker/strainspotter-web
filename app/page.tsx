'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>StrainSpotter</h1>

      <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
        <Link href="/garden">
          <button>🌿 Enter the Garden</button>
        </Link>

        <Link href="/scan">
          <button>📸 Scan a Strain</button>
        </Link>
      </div>
    </main>
  )
}
