'use client'

import TopNav from './_components/TopNav'
import GlassIconButton from '@/components/ui/GlassIconButton'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import LocalFloristIcon from '@mui/icons-material/LocalFlorist'
import StorefrontIcon from '@mui/icons-material/Storefront'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import SpaIcon from '@mui/icons-material/Spa'

export default function GardenPage() {
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

        {/* Icon Field — medium circular glass buttons */}
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
          <GlassIconButton
            label="Scanner"
            icon={<CameraAltIcon fontSize="small" />}
            href="/garden/scanner"
            size={64}
          />
          <GlassIconButton
            label="Seed Vendors"
            icon={<SpaIcon fontSize="small" />}
            href="/garden/seed-vendors"
            size={64}
          />
          <GlassIconButton
            label="Ecosystem"
            icon={<LocalFloristIcon fontSize="small" />}
            href="/garden/ecosystem"
            size={64}
          />
          <GlassIconButton
            label="Dispensaries"
            icon={<StorefrontIcon fontSize="small" />}
            href="/garden/dispensaries"
            size={64}
          />
          <GlassIconButton
            label="Grow Coach"
            icon={<AutoAwesomeIcon fontSize="small" />}
            href="/garden/grow-coach"
            size={64}
          />
          <GlassIconButton
            label="History"
            icon={<HistoryIcon fontSize="small" />}
            href="/garden/history"
            size={64}
          />
          <GlassIconButton
            label="Strains"
            icon={<LocalFloristIcon fontSize="small" />}
            href="/garden/strains"
            size={64}
          />
          <GlassIconButton
            label="Favorites"
            icon={<FavoriteIcon fontSize="small" />}
            href="/garden/favorites"
            size={64}
          />
          <GlassIconButton
            label="Settings"
            icon={<SettingsIcon fontSize="small" />}
            href="/garden/settings"
            size={64}
          />
        </div>
      </section>
    </>
  )
}
