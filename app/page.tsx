'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <main className="landing">
      <Image
        src="/hero.png"
        alt="StrainSpotter"
        width={140}
        height={140}
        priority
      />

      <button
        className="primary-btn"
        onClick={() => router.push('/garden')}
      >
        Enter the Garden
      </button>

      <button
        className="secondary-btn"
        onClick={() => router.push('/scan')}
      >
        Scan a Strain
      </button>
    </main>
  )
}
