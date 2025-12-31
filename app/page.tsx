'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <main>
      <h1>StrainSpotter</h1>
      <button onClick={() => router.push('/garden')}>
        Enter the Garden
      </button>
    </main>
  )
}
