'use client'

import TopNav from './_components/TopNav'
import GlassIconButton from '@/components/ui/GlassIconButton'
import MembershipCTA from '@/components/MembershipCTA'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
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
        <div className="flex flex-col items-center mb-10">
          <div className="text-5xl mb-3">🍃</div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            StrainSpotter
          </h1>
          <p className="text-white/45 text-xs mt-2 tracking-widest uppercase">
            AI Cannabis Identification
          </p>
        </div>

        {/* Membership CTA Banner */}
        <div className="w-full max-w-sm mb-8">
          <MembershipCTA variant="banner" />
        </div>

        {/* iOS-style icon grid */}
        <div
          className="grid grid-cols-3 place-items-center"
          style={{ gap: '28px 40px' }}
        >
          <GlassIconButton
            label="Scanner"
            icon={<CameraAltIcon sx={{ fontSize: 28 }} />}
            href="/garden/scanner"
            gradient="linear-gradient(135deg, #43A047, #1B5E20)"
          />
          <GlassIconButton
            label="Strains"
            icon={<YardIcon sx={{ fontSize: 28 }} />}
            href="/garden/strains"
            gradient="linear-gradient(135deg, #66BB6A, #2E7D32)"
          />
          <GlassIconButton
            label="Grow Coach"
            icon={<AutoAwesomeIcon sx={{ fontSize: 28 }} />}
            href="/garden/grow-coach"
            gradient="linear-gradient(135deg, #FFB74D, #E65100)"
          />
          <GlassIconButton
            label="Ecosystem"
            icon={<AccountTreeIcon sx={{ fontSize: 28 }} />}
            href="/garden/ecosystem"
            gradient="linear-gradient(135deg, #4FC3F7, #0277BD)"
          />
          <GlassIconButton
            label="Dispensaries"
            icon={<StorefrontIcon sx={{ fontSize: 28 }} />}
            href="/garden/dispensaries"
            gradient="linear-gradient(135deg, #EF5350, #B71C1C)"
          />
          <GlassIconButton
            label="Seed Vendors"
            icon={<SpaIcon sx={{ fontSize: 28 }} />}
            href="/garden/seed-vendors"
            gradient="linear-gradient(135deg, #AB47BC, #6A1B9A)"
          />
          <GlassIconButton
            label="History"
            icon={<HistoryIcon sx={{ fontSize: 28 }} />}
            href="/garden/history"
            gradient="linear-gradient(135deg, #78909C, #37474F)"
          />
          <GlassIconButton
            label="Favorites"
            icon={<FavoriteIcon sx={{ fontSize: 28 }} />}
            href="/garden/favorites"
            gradient="linear-gradient(135deg, #E91E63, #880E4F)"
          />
          <GlassIconButton
            label="Settings"
            icon={<SettingsIcon sx={{ fontSize: 28 }} />}
            href="/garden/settings"
            gradient="linear-gradient(135deg, #90A4AE, #455A64)"
          />
        </div>

        {/* Bottom benefit text */}
        <div className="mt-12 text-center max-w-xs">
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', lineHeight: 1.6 }}>
            Identify any cannabis strain with AI • Get personalized grow coaching • 
            Find dispensaries near you • Explore strain genetics & terpenes
          </p>
        </div>
      </section>
    </>
  )
}
