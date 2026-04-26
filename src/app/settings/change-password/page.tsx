'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { PasswordStrengthBar } from '@/components/ui/PasswordStrengthBar'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword.trim()) {
      toast.warning('Mevcut şifrenizi girin')
      return
    }
    if (newPassword.length < 8) {
      toast.warning('Yeni şifre en az 8 karakter olmalı')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Yeni şifre ve tekrarı eşleşmiyor')
      return
    }
    setLoading(true)
    try {
      const res = await fetchApi<{ message?: string }>('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword.trim(), newPassword }),
      })
      toast.success(res?.message ?? 'Şifre güncellendi')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şifre güncellenemedi'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Şifre değiştir"
      subtitle="Hesabınızın şifresini güncelleyin"
      icon={Lock}
    >
      <div className="max-w-md">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Ayarlara dön
        </Link>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-gray-300 mb-1">
              Mevcut şifre
            </label>
            <div className="relative">
              <input
                id="current"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                aria-label={showCurrent ? 'Gizle' : 'Göster'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-gray-300 mb-1">
              Yeni şifre (en az 8 karakter, büyük/küçük harf ve rakam)
            </label>
            <div className="relative">
              <input
                id="new"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                aria-label={showNew ? 'Gizle' : 'Göster'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthBar password={newPassword} />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1">
              Yeni şifre (tekrar)
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 transition"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
          </button>
        </form>
      </div>
    </AppDashboardLayout>
  )
}
