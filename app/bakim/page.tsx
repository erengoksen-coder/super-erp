'use client'

import { Wrench } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'

export default function BakimPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <LogoWithBackground size="lg" className="mb-6" />
      <div className="flex items-center justify-center gap-3 text-amber-400 mb-4">
        <Wrench className="w-12 h-12" />
        <h1 className="text-2xl font-bold text-white">Bakım Çalışması</h1>
      </div>
      <p className="text-gray-400 max-w-md mb-2">
        Sistem şu anda bakım çalışması nedeniyle geçici olarak kapalıdır.
      </p>
      <p className="text-gray-500 text-sm">
        Kısa süre içinde tekrar hizmetinizde olacağız. Anlayışınız için teşekkür ederiz.
      </p>
      <a
        href="/durum"
        className="mt-8 text-sm text-gray-500 hover:text-gray-400 underline"
      >
        Sistem durumunu kontrol et
      </a>
    </div>
  )
}
