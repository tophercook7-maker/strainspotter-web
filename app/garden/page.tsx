'use client'

import { useRouter } from 'next/navigation'
import TopNav from "@/components/TopNav";
import GardenIcon from './_components/GardenIcon'

const gardenItems = [
  { label: 'Scanner', icon: '📷', route: '/garden/scanner' },
  { label: 'Dispensaries', icon: '🏪', route: '/garden/dispensaries' },
  { label: 'Strains', icon: '🌿', route: '/garden/strains' },
  { label: 'Seed Vendors', icon: '🌱', route: '/garden/seed-vendors' },
  { label: 'Grow Coach', icon: '🧠', route: '/garden/grow-coach' },
  { label: 'Favorites', icon: '⭐', route: '/garden/favorites' },
  { label: 'Ecosystem', icon: '🧬', route: '/garden/ecosystem' },
  { label: 'History', icon: '🕘', route: '/garden/history' },
  { label: 'Settings', icon: '⚙️', route: '/garden/settings' },
]

export default function GardenPage() {
  const router = useRouter()

  return (
    <>
      <TopNav title="The Garden" showBack={false} />
      <section className="relative min-h-screen flex flex-col items-center justify-start pt-24 text-white">

      {/* Brand */}
      <div className="flex flex-col items-center mb-14">
        <div className="text-4xl mb-4">🍃</div>
        <h1 className="text-5xl font-semibold tracking-tight">
          StrainSpotter AI
        </h1>
      </div>

      {/* Icon Field */}
      <div
        className="
          w-full
          max-w-4xl
          grid
          grid-cols-3
          gap-x-16
          gap-y-14
          place-items-center
        "
      >
        {gardenItems.map((item) => (
          <GardenIcon
            key={item.label}
            label={item.label}
            icon={item.icon}
            onClick={() => router.push(item.route)}
            size="lg"
          />
        ))}
      </div>

    </section>
    </>
  )
}
