'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || ''
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setHydrated = useAuthStore((state) => state.setHydrated)
  const [isNgrok, setIsNgrok] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hostname : ''
    setIsNgrok(h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io'))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await fetchApi('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const user = (data as any)?.user ?? (data as any)?.data?.user
      const accessToken = (data as any)?.accessToken ?? (data as any)?.data?.accessToken

      if (!user) {
        throw new Error('Giriş başarısız: kullanıcı bilgisi alınamadı')
      }

      if (accessToken && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('auth-token', accessToken)
        } catch {}
      }
      setAuth(user)
      setHydrated(true)
      const name = (user as any)?.full_name || (user as any)?.username || ''
      toast.success(name ? `Hoş geldiniz, ${name}` : 'Giriş başarılı')

      const role = (user as any)?.role ?? ''
        const isBayi = (typeof role === 'string' && role.trim().toLowerCase() === 'bayi')
        const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : (isBayi ? '/bayi' : '/')
      router.push(target)
    } catch (error: any) {
      // API'den gelen hata mesajını al
      const errorMessage = error?.message || error?.error || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.'
      setError(errorMessage)
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Açılış: önce logo tam ekran, sonra giriş formu */}
      {showSplash ? (
        <div className="absolute inset-0 bg-gray-900 z-20 overflow-hidden" aria-hidden>
          <img
            src="/LOGO-2.png"
            alt="LIVASOFTWARE"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-20"
            style={{ transform: 'scale(1.5)' }}
            onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }}
          />
        </div>
      ) : null}

      {/* Arka plan: logo görsel olarak büyük, sayfaya sığdırılmış (soluk) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <img
          src="/LOGO-2.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.08]"
          style={{ transform: 'scale(1.5)' }}
          onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }}
        />
      </div>
      <div
        className={`w-full max-w-lg relative z-10 transition-opacity duration-500 ${showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="bg-gray-800/95 rounded-lg border border-gray-700 p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <img src="/LOGO-2.png" alt="LIVASOFTWARE" className="w-full max-h-36 object-contain mx-auto mb-4" onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }} />
            <h1 className="text-3xl font-bold text-white mb-2">LIVASOFA ERP</h1>
            <p className="text-gray-400">Giriş Yapın</p>
            {isNgrok && (
              <p className="text-xs text-green-400 mt-2">İnternet erişimi: Ngrok üzerinden bağlandınız. İlk açılışta Ngrok uyarı sayfasında &quot;Siteye Git&quot; / &quot;Visit Site&quot; butonuna tıklayın.</p>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-300 text-sm">
                <p>{error}</p>
                {isNgrok && (error.includes('hatalı') || error.includes('incorrect')) && (
                  <p className="mt-2 text-red-200/90 text-xs">Farklı bilgisayardan girişte: Kullanıcı adı ve şifreyi tekrar yazın; klavye dili (TR/EN) veya büyük/küçük harf farkı olabilir.</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kullanıcı adınızı girin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şifrenizi girin"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <LogIn className="w-5 h-5" />
              <span>{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</span>
            </button>
            <p className="mt-3 text-center">
              <Link href="/auth/forgot-password" className="text-gray-400 hover:text-blue-400 text-sm">
                Şifremi unuttum
              </Link>
            </p>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/register"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Hesabınız yok mu? Kayıt olun
            </Link>
            <p className="mt-3 text-sm font-medium text-blue-500">Powered by LIVASOFTWARE</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}


