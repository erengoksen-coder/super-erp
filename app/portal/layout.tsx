import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../../globals.css'
import { Toaster } from 'sonner'
import SuppressHydrationWarnings from '@/app/suppress-hydration-warnings'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'B2B Portal - LivaSofa ERP',
    description: 'Tedarikçi ve Müşteri Portalı',
}

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="tr" className="light" suppressHydrationWarning>
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`} suppressHydrationWarning>
                <SuppressHydrationWarnings />
                <Toaster position="top-right" />
                {children}
            </body>
        </html>
    )
}
