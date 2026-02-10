'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, LogIn, XCircle, Loader2 } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

type HealthState = 'loading' | 'healthy' | 'unhealthy'

export default function DurumPage() {
  const [health, setHealth] = useState<HealthState>('loading')
  const [detail, setDetail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health?deep=true')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const ok = data?.ok === true
        setHealth(ok ? 'healthy' : 'unhealthy')
        const dbCheck = data?.checks?.database
        if (!ok && dbCheck?.detail) setDetail(dbCheck.detail)
      })
      .catch(() => {
        if (!cancelled) {
          setHealth('unhealthy')
          setDetail('API yanıt vermiyor')
        }
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {health === 'loading' && (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 text-gray-400 mb-6">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        )}
        {health === 'healthy' && (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
        )}
        {health === 'unhealthy' && (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-400 mb-6">
            <XCircle className="w-10 h-10" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-white mb-2">
          {health === 'loading' && 'Kontrol ediliyor...'}
          {health === 'healthy' && 'Sistem çalışıyor'}
          {health === 'unhealthy' && 'Sorun tespit edildi'}
        </h1>
        <p className="text-gray-400 mb-8">
          {health === 'loading' && 'Sunucu ve veritabanı durumu kontrol ediliyor.'}
          {health === 'healthy' && 'LIVASOFA ERP sunucusu ve veritabanı yanıt veriyor. Giriş yaparak devam edebilirsiniz.'}
          {health === 'unhealthy' && (detail || 'Veritabanı bağlantısı veya sunucu yanıtı alınamadı. Lütfen yönetici ile iletişime geçin.')}
        </p>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
        >
          <LogIn className="w-5 h-5" />
          Giriş Yap
        </Link>
        <p className="text-gray-500 text-sm mt-6">
          <Link href={ROUTES.HOME} className="underline hover:text-gray-400">Ana sayfa</Link>
          {' · '}
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">API durumu (JSON)</a>
        </p>
      </div>
    </div>
  )
}
