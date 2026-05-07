import './globals.css'
import { DatabaseInitializer } from '@/lib/scanner/dbInitializer'
import AgeGate from '@/components/AgeGate'
import OfflineBanner from '@/components/OfflineBanner'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'StrainSpotter — Scan, Analyze, and Grow Cannabis',
    template: '%s | StrainSpotter',
  },
  description:
    'Scan cannabis labels and flower with AI for honest strain analysis, validate seller claims, and follow Grow Doctor through the entire cultivation lifecycle — from seed sourcing to safe enjoyment.',
  applicationName: 'StrainSpotter',
  manifest: '/manifest.json',
  keywords: [
    'cannabis',
    'strain identification',
    'AI scanner',
    'terpene profile',
    'grow doctor',
    'grow coach',
    'marijuana',
    'weed identifier',
    'cannabis cultivation',
  ],
  openGraph: {
    title: 'StrainSpotter — Scan, Analyze, and Grow Cannabis',
    description:
      'Snap a photo for honest strain analysis. Track your grow from seed to harvest with Grow Doctor.',
    url: 'https://strainspotter.app',
    siteName: 'StrainSpotter',
    type: 'website',
    images: [{ url: '/icons/app/icon-1024.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrainSpotter — Scan, Analyze, and Grow Cannabis',
    description:
      'Snap a photo for honest strain analysis. Track your grow from seed to harvest with Grow Doctor.',
    images: ['/icons/app/icon-1024.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'StrainSpotter',
    statusBarStyle: 'black-translucent',
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
        <OfflineBanner />
        <AgeGate>
          {children}
        </AgeGate>
        <Analytics />
      </body>
    </html>
  )
}
