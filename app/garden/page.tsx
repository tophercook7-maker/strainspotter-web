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
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import YardIcon from '@mui/icons-material/Yard'

export default function GardenPage() {
  return (
    <>
      <TopNav title="The Garden" showBack={false} />
      <section className="relative min-h-screen flex flex-col items-center justify-start pt-16 pb-20 text-white">
        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <div className="text-5xl mb-3">🍃</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            StrainSpotter
          </h1>
          <p className="text-white/50 text-sm mt-2 tracking-wide">
            AI-Powered Cannabis Identification
          </p>
        </div>

        {/* Button grid — compact cards, generous spacing */}
        <div className="w-full max-w-md grid grid-cols-3 gap-5 px-6">
          <GlassIconButton
            label="Scanner"
            icon={<CameraAltIcon sx={{ fontSize: 20 }} />}
            href="/garden/scanner"
            accent="rgba(76,175,80,0.35)"
          />
          <GlassIconButton
            label="Strains"
            icon={<YardIcon sx={{ fontSize: 20 }} />}
            href="/garden/strains"
            accent="rgba(102,187,106,0.3)"
          />
          <GlassIconButton
            label="Grow Coach"
            icon={<AutoAwesomeIcon sx={{ fontSize: 20 }} />}
            href="/garden/grow-coach"
            accent="rgba(255,183,77,0.35)"
          />
          <GlassIconButton
            label="Ecosystem"
            icon={<AccountTreeIcon sx={{ fontSize: 20 }} />}
            href="/garden/ecosystem"
            accent="rgba(129,212,250,0.3)"
          />
          <GlassIconButton
            label="Dispensaries"
            icon={<StorefrontIcon sx={{ fontSize: 20 }} />}
            href="/garden/dispensaries"
            accent="rgba(239,83,80,0.3)"
          />
          <GlassIconButton
            label="Seed Vendors"
            icon={<SpaIcon sx={{ fontSize: 20 }} />}
            href="/garden/seed-vendors"
            accent="rgba(171,71,188,0.3)"
          />
          <GlassIconButton
            label="History"
            icon={<HistoryIcon sx={{ fontSize: 20 }} />}
            href="/garden/history"
            accent="rgba(255,255,255,0.12)"
          />
          <GlassIconButton
            label="Favorites"
            icon={<FavoriteIcon sx={{ fontSize: 20 }} />}
            href="/garden/favorites"
            accent="rgba(244,67,54,0.3)"
          />
          <GlassIconButton
            label="Settings"
            icon={<SettingsIcon sx={{ fontSize: 20 }} />}
            href="/garden/settings"
            accent="rgba(255,255,255,0.12)"
          />
        </div>
      </section>
    </>
  )
}
