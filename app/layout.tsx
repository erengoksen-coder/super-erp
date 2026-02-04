import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './design-system.css'
import './mobile-optimization.css'
import './animations.css'
import './performance.css'
import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'
import { I18nProvider } from '@/lib/i18n'
import SWRProvider from '@/components/SWRProvider'
import ServiceWorker from '@/components/ServiceWorker'
import GlobalBarcodeListener from '@/components/GlobalBarcodeListener'
import { ThemeProvider } from '@/lib/theme'
import ScrollToTop from '@/components/ScrollToTop'
import MainShell from '@/components/MainShell'
import SuppressHydrationWarnings from './suppress-hydration-warnings'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LIVASOFA - Süper ERP',
  description: 'Koltuk Üretim Yönetim Sistemi',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100`} suppressHydrationWarning style={{ margin: 0, padding: 0, overflow: 'hidden', width: '100vw', height: '100vh', position: 'fixed', inset: 0 }}>
        <SuppressHydrationWarnings />
        <ThemeProvider>
          <I18nProvider>
            <SWRProvider>
              <AuthGuard>
              <ServiceWorker />
              <GlobalBarcodeListener />
              <ScrollToTop />
              <Sidebar />
              <MainShell>{children}</MainShell>
            </AuthGuard>
          </SWRProvider>
        </I18nProvider>
      </ThemeProvider>
      </body>
    </html>
  )
}
