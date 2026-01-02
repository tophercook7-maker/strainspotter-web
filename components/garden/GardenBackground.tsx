'use client'

import { ReactNode } from 'react'

interface GardenBackgroundProps {
  children: ReactNode
}

export default function GardenBackground({ children }: GardenBackgroundProps) {
  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/backgrounds/garden-field.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Dark Overlay with Backdrop Blur */}
      <div className="fixed inset-0 z-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  )
}
