import './globals.css'
import { DatabaseInitializer } from '@/lib/scanner/dbInitializer'

export const metadata = {
  title: 'StrainSpotter',
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
        {children}
      </body>
    </html>
  )
}
