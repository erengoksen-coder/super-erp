import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'
import { I18nProvider } from '@/lib/i18n'
import SWRProvider from '@/components/SWRProvider'
import ServiceWorker from '@/components/ServiceWorker'
import GlobalBarcodeListener from '@/components/GlobalBarcodeListener'

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
    <html lang="tr" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
        <I18nProvider>
          <SWRProvider>
            <AuthGuard>
              <ServiceWorker />
              <GlobalBarcodeListener />
              <Sidebar />
              <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
                <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                  {children}
                </div>
              </main>
            </AuthGuard>
          </SWRProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
