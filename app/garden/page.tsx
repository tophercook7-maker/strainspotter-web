'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import GardenButtonsFiltered from '@/components/garden/GardenButtonsFiltered'
import GardenBackground from '@/components/garden/GardenBackground'
import ResponsiveShell from '@/components/layout/ResponsiveShell'

export default function GardenPage() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.pathname = '/login'
        return
      }
    })
  }, [])

  return (
    <ResponsiveShell>
      <GardenBackground>
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
          {/* Hero Section */}
          <div className="mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              The Garden
            </h1>
            <p className="text-base md:text-lg text-white/70 max-w-2xl">
              Everything related to your grow, tools
            </p>
          </div>

          {/* Section Groups with Glass Cards */}
          <GardenButtonsFiltered />
        </div>
      </GardenBackground>
    </ResponsiveShell>
  )
}
