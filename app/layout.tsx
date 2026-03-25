import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Livasofa ERP - Human Resources',
  description: 'Enterprise Resource Planning for Furniture Manufacturing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-[#030712]`}>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-72">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
