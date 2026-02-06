'use client'

import Link from 'next/link'
import { CheckCircle, LogIn } from 'lucide-react'

export default function DurumPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sistem çalışıyor</h1>
        <p className="text-gray-400 mb-8">
          LIVASOFA ERP sunucusu yanıt veriyor. Giriş yaparak devam edebilirsiniz.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
        >
          <LogIn className="w-5 h-5" />
          Giriş Yap
        </Link>
        <p className="text-gray-500 text-sm mt-6">
          <Link href="/" className="underline hover:text-gray-400">Ana sayfa</Link>
          {' · '}
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">API durumu</a>
        </p>
      </div>
    </div>
  )
}
