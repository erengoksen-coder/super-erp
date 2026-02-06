'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'

export default function LoginPage() {
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

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hostname : ''
    setIsNgrok(h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io'))
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

      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/'
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">LIVASOFA ERP</h1>
            <p className="text-gray-400">Giriş Yapın</p>
            {isNgrok && (
              <p className="text-xs text-green-400 mt-2">İnternet erişimi: Ngrok üzerinden bağlandınız.</p>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-300 text-sm">{error}</div>
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
          </form>

          <div className="mt-6 text-center">
            <a
              href="/auth/register"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Hesabınız yok mu? Kayıt olun
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}


