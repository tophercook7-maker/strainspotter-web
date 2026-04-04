'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MembershipCTA from '@/components/MembershipCTA'
import ScanPaywall from '@/components/ScanPaywall'
import { getScansRemaining, FREE_SCAN_TOTAL } from '@/lib/scanGating'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import StorefrontIcon from '@mui/icons-material/Storefront'
import YardIcon from '@mui/icons-material/Yard'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SpaIcon from '@mui/icons-material/Spa'
import FavoriteIcon from '@mui/icons-material/Favorite'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import LockIcon from '@mui/icons-material/Lock'

export default function GardenPage() {
  const router = useRouter()
  const [showPaywall, setShowPaywall] = useState(false)
  const remaining = typeof window !== 'undefined' ? getScansRemaining() : FREE_SCAN_TOTAL

  // Scan bar color
  const pct = (remaining / FREE_SCAN_TOTAL) * 100
  const barColor = remaining <= 1 ? '#EF5350' : remaining <= 2 ? '#FFB74D' : '#66BB6A'

  return (
    <>
      <section
        className="relative min-h-screen flex flex-col items-center text-white"
        style={{ background: '#0e1210' }}
      >
        {/* ── Top branding ── */}
        <div className="flex flex-col items-center pt-14 pb-2">
          <div className="text-4xl mb-2">🍃</div>
          <h1 className="text-3xl font-extrabold tracking-tight">StrainSpotter</h1>
          <p className="text-white/35 text-[10px] mt-1 tracking-[3px] uppercase">
            AI Cannabis Identification
          </p>
        </div>

        {/* ── Scan counter ── */}
        <div className="w-full max-w-xs px-6 mt-4 mb-6">
          <div className="flex justify-between items-center mb-1">
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Free Scans
            </span>
            <span style={{ color: barColor, fontSize: 12, fontWeight: 700 }}>
              {remaining} / {FREE_SCAN_TOTAL}
            </span>
          </div>
          <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SCANNER — Front & Center
        ══════════════════════════════════════════════ */}
        <button
          onClick={() => router.push('/garden/scanner')}
          className="group"
          style={{
            width: '85%',
            maxWidth: 360,
            aspectRatio: '1 / 1',
            borderRadius: 32,
            border: '2px solid rgba(76,175,80,0.3)',
            background: 'radial-gradient(circle at 50% 40%, rgba(76,175,80,0.12) 0%, rgba(0,0,0,0.4) 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.15s, border-color 0.2s',
          }}
        >
          {/* Corner brackets — viewfinder effect */}
          {/* Top-left */}
          <div style={{ position: 'absolute', top: 20, left: 20, width: 28, height: 28, borderTop: '2px solid rgba(76,175,80,0.5)', borderLeft: '2px solid rgba(76,175,80,0.5)', borderRadius: '4px 0 0 0' }} />
          {/* Top-right */}
          <div style={{ position: 'absolute', top: 20, right: 20, width: 28, height: 28, borderTop: '2px solid rgba(76,175,80,0.5)', borderRight: '2px solid rgba(76,175,80,0.5)', borderRadius: '0 4px 0 0' }} />
          {/* Bottom-left */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, width: 28, height: 28, borderBottom: '2px solid rgba(76,175,80,0.5)', borderLeft: '2px solid rgba(76,175,80,0.5)', borderRadius: '0 0 0 4px' }} />
          {/* Bottom-right */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 28, height: 28, borderBottom: '2px solid rgba(76,175,80,0.5)', borderRight: '2px solid rgba(76,175,80,0.5)', borderRadius: '0 0 4px 0' }} />

          {/* Scan line animation */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: '10%', right: '10%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(76,175,80,0.4), transparent)',
              animation: 'scanline 3s ease-in-out infinite',
            }}
          />

          {/* Camera icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #43A047, #1B5E20)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(76,175,80,0.3)',
            }}
          >
            <CameraAltIcon sx={{ fontSize: 40, color: '#fff' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
              Scan a Strain
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
              Snap a photo • Get instant AI identification
            </p>
          </div>
        </button>

        {/* ══════════════════════════════════════════════
            THE GARDEN — Secondary Access
        ══════════════════════════════════════════════ */}
        <div className="w-full max-w-xs px-4 mt-8 mb-6">
          <button
            onClick={() => setShowPaywall(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(76,175,80,0.04))',
              border: '1px solid rgba(255,215,0,0.15)',
              borderRadius: 20,
              padding: '18px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Garden icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(255,215,0,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 24 }}>🌿</span>
            </div>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#FFD54F', fontSize: 15, fontWeight: 800 }}>
                  The Garden
                </span>
                <LockIcon sx={{ fontSize: 13, color: 'rgba(255,215,0,0.4)' }} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.4, margin: '3px 0 0' }}>
                Grow Coach • Dispensaries • Strains • Ecosystem
              </p>
            </div>

            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* ── Quick feature icons (subtle preview) ── */}
        <div className="flex gap-6 mb-8 opacity-40">
          {[
            { icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />, label: 'Grow' },
            { icon: <StorefrontIcon sx={{ fontSize: 16 }} />, label: 'Shops' },
            { icon: <YardIcon sx={{ fontSize: 16 }} />, label: 'Strains' },
            { icon: <AccountTreeIcon sx={{ fontSize: 16 }} />, label: 'Genetics' },
            { icon: <SpaIcon sx={{ fontSize: 16 }} />, label: 'Seeds' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div style={{ color: 'rgba(255,255,255,0.5)' }}>{item.icon}</div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Bottom links ── */}
        <div className="flex gap-6 pb-10">
          <button
            onClick={() => router.push('/garden/history')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <HistoryIcon sx={{ fontSize: 14 }} /> History
          </button>
          <button
            onClick={() => router.push('/garden/favorites')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <FavoriteIcon sx={{ fontSize: 14 }} /> Favorites
          </button>
          <button
            onClick={() => router.push('/garden/settings')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <SettingsIcon sx={{ fontSize: 14 }} /> Settings
          </button>
        </div>

        {/* ── Footer ── */}
        <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, paddingBottom: 24, textAlign: 'center' }}>
          StrainSpotter • AI-Powered Cannabis Identification
        </p>
      </section>

      {/* Scan line animation */}
      <style jsx>{`
        @keyframes scanline {
          0% { top: 15%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
      `}</style>

      {/* Paywall overlay */}
      {showPaywall && (
        <ScanPaywall mode="warning" onClose={() => setShowPaywall(false)} />
      )}
    </>
  )
}
