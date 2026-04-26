'use client'

import { useRouter } from 'next/navigation'
import { Home, Search, ArrowLeft } from 'lucide-react'

/**
 * Custom 404 Not Found page.
 * Matches the Super ERP dark platinum aesthetic with glow effects and animations.
 */
export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 Display */}
        <div className="mb-8">
          <p className="text-[120px] font-black leading-none bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent select-none">
            404
          </p>
        </div>

        {/* Icon & Message */}
        <div className="mb-10 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Search className="w-7 h-7 text-white/40" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider italic">
            Sayfa Bulunamadı
          </h1>
          <p className="text-sm text-white/40 leading-relaxed">
            Aradığınız sayfa mevcut değil, taşınmış veya silinmiş olabilir.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/5 mb-10" />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white/60 hover:text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Dön
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl text-sm font-bold text-indigo-300 hover:text-indigo-200 uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Ana Sayfaya Git
          </button>
        </div>
      </div>

      {/* Footer Badge */}
      <div className="absolute bottom-12 text-[9px] font-black text-white/10 uppercase tracking-[0.3em] italic">
        SÜPER ERP v4.0 • 404 NOT FOUND
      </div>
    </div>
  )
}
