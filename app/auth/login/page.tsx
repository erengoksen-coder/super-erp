'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore, type AuthUser } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { userSchemas } from '@/lib/validation/schemas'
import type { z } from 'zod'

type LoginFormData = z.infer<typeof userSchemas.login>

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || ''
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setHydrated = useAuthStore((state) => state.setHydrated)
  const [isNgrok, setIsNgrok] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(userSchemas.login) as Resolver<LoginFormData>,
    defaultValues: { username: '', password: '' },
  })

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hostname : ''
    setIsNgrok(h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io') || h.endsWith('trycloudflare.com'))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])

  async function onValid(data: LoginFormData) {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password }),
      })
      const payload = await res.json().catch(() => ({})) as { success?: boolean; data?: { user?: unknown; accessToken?: string }; user?: unknown; accessToken?: string; error?: string }

      if (!res.ok || payload.success === false) {
        const msg = payload?.error || (res.status === 401 ? 'Kullanıcı adı veya şifre hatalı.' : 'Giriş yapılamadı. Lütfen tekrar deneyin.')
        setError(msg)
        setLoading(false)
        return
      }

      const dataPayload = payload.data ?? payload
      const user = dataPayload?.user ?? (payload as { user?: unknown }).user
      const accessToken = dataPayload?.accessToken ?? (payload as { accessToken?: string }).accessToken

      if (!user) {
        setError('Giriş başarısız: kullanıcı bilgisi alınamadı')
        setLoading(false)
        return
      }

      if (accessToken && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('auth-token', accessToken)
        } catch {}
      }
      const u = user as Record<string, unknown>
      setAuth({
        id: (u.id as string) ?? '',
        username: (u.username as string) ?? '',
        role: (u.role as string) ?? 'user',
        ...u,
      } as AuthUser)
      setHydrated(true)
      const name = (user as { full_name?: string; username?: string })?.full_name || (user as { username?: string })?.username || ''
      toast.success(name ? `Hoş geldiniz, ${name}` : 'Giriş başarılı')

      const role = (user as { role?: string })?.role ?? ''
      const isBayi = (typeof role === 'string' && role.trim().toLowerCase() === 'bayi')
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : (isBayi ? '/bayi' : '/')
      router.push(target)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.'
      setError(errorMessage)
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

          <form onSubmit={handleSubmit(onValid)} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  {...register('username')}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.username ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="Kullanıcı adınızı girin"
                />
              </div>
              {errors.username && (
                <p id="username-error" className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`w-full pl-10 pr-10 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="Şifrenizi girin"
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
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
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


