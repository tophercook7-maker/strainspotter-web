import './globals.css'
import { DatabaseInitializer } from '@/lib/scanner/dbInitializer'
import AgeGate from '@/components/AgeGate'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'StrainSpotter — AI Cannabis Identification',
    template: '%s | StrainSpotter',
  },
  description:
    'AI-powered cannabis strain identification. Snap a photo and get instant strain analysis with terpene profiles, effects, and grow coaching tips.',
  keywords: [
    'cannabis',
    'strain identification',
    'AI scanner',
    'terpene profile',
    'grow coach',
    'marijuana',
    'weed identifier',
  ],
  openGraph: {
    title: 'StrainSpotter — AI Cannabis Identification',
    description:
      'Snap a photo. Get instant strain analysis with terpene profiles, effects, and grow coaching.',
    url: 'https://strainspotter.app',
    siteName: 'StrainSpotter',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrainSpotter — AI Cannabis Identification',
    description:
      'Snap a photo. Get instant strain analysis with terpene profiles, effects, and grow coaching.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1f1c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DatabaseInitializer />
        <AgeGate>
          {children}
        </AgeGate>
        <Analytics />
      </body>
    </html>
  )
}
