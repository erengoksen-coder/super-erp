'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.warning('Geçersiz link. E-posta ile gelen linki kullanın.')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.warning('Geçersiz link')
      return
    }
    if (newPassword.length < 8) {
      toast.warning('Şifre en az 8 karakter olmalıdır')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Şifreler eşleşmiyor')
      return
    }
    setLoading(true)
    try {
      await fetchApi('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      toast.success('Şifreniz güncellendi')
      router.push('/auth/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      const turkishMsg =
        msg && /[ğüşıöçĞÜŞİÖÇ]/.test(msg)
          ? msg
          : 'Şifre güncellenirken bir hata oluştu. Lütfen linki tekrar deneyin veya yeni talep oluşturun.'
      toast.error(turkishMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
          <p className="text-gray-400 mb-4">Geçersiz veya eksik şifre sıfırlama linki.</p>
          <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-300">
            Yeni link talep et
          </Link>
          {' · '}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Giriş
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Lock className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Yeni şifre belirle</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Yeni şifre (en az 8 karakter)
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Şifre tekrar
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 disabled:opacity-50 transition"
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
          </button>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Giriş sayfasına dön
          </Link>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Yükleniyor...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
