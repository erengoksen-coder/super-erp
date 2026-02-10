'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, User, Lock, Mail, Briefcase, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/notify'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'user' as 'admin' | 'user' | 'manager' | 'viewer',
    job_title: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const rawUsername = formData.username.trim()
    if (rawUsername.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalıdır')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    if (formData.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermeli')
      return
    }
    const trimmedName = (formData.full_name || '').trim()
    if (trimmedName.length < 2) {
      setError('Ad soyad en az 2 karakter olmalıdır')
      return
    }

    setLoading(true)
    setError('')

    // Eski form "Görev/Ünvan"a yönetici yazabiliyor (role veya job_title); API hep admin|user|manager|viewer bekliyor
    const roleInput = String(formData.role || formData.job_title || '').trim().toLowerCase()
    const roleForApi =
      roleInput === 'admin' || roleInput === 'manager' || roleInput === 'viewer' ? roleInput
      : /y[oö]netici/.test(roleInput) ? 'manager'
      : /g[oö]r[uü]nt[uü]leyici/.test(roleInput) ? 'viewer'
      : /kullan[iı]c[iı]/.test(roleInput) ? 'user'
      : 'user'

    const payload = {
      username: rawUsername,
      password: formData.password,
      full_name: trimmedName,
      role: roleForApi,
      ...(formData.email?.trim() ? { email: formData.email.trim() } : {}),
      ...(formData.job_title?.trim() ? { job_title: formData.job_title.trim() } : {}),
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : data?.message || `Hata (${res.status}). Lütfen bilgileri kontrol edin.`
        setError(msg)
        setLoading(false)
        return
      }
      toast.success('Kayıt başarılı. Admin onayı bekleniyor; onaylandıktan sonra giriş yapabilirsiniz.')
      router.push('/auth/login')
    } catch (err: any) {
      setError(err?.message || 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <img src="/LOGO-2.png" alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.08]" style={{ transform: 'scale(1.5)' }} onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }} />
      </div>
      <div className="w-full max-w-lg relative z-10">
        <div className="bg-gray-800/95 rounded-lg border border-gray-700 p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <img src="/LOGO-2.png" alt="LIVASOFTWARE" className="w-full max-h-36 object-contain mx-auto mb-4" onError={(e) => { const t = e.target as HTMLImageElement; if (t) t.src = '/logo.png'; }} />
            <h1 className="text-3xl font-bold text-white mb-2">LIVASOFA ERP</h1>
            <p className="text-gray-400">Yeni Hesap Oluştur</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kullanıcı adı"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="E-posta adresi"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ad Soyad
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ad Soyad (en az 2 karakter)"
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rol *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' | 'manager' | 'viewer' })}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                  required
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Yönetici</option>
                  <option value="viewer">Görüntüleyici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                İş unvanı (isteğe bağlı)
              </label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Usta, Depo Sorumlusu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="En az 8 karakter, büyük/küçük harf ve rakam"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre Tekrar *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şifreyi tekrar girin"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>{loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/auth/login"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Zaten hesabınız var mı? Giriş yapın
            </a>
            <p className="mt-3 text-sm font-medium text-blue-500">Powered by LIVASOFTWARE</p>
          </div>
        </div>
      </div>
    </div>
  )
}


