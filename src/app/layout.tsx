import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import './design-system.css'
import './mobile-optimization.css'
import './animations.css'
import './performance.css'

import { Providers } from '@/components/Providers'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LIVASOFA ERP',
  description: 'Enterprise Resource Planning',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={outfit.className} style={{ margin: 0, padding: 0 }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
