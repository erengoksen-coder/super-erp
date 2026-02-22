'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, User, Lock, Mail, Briefcase, AlertCircle } from 'lucide-react'
import { toast } from '@/lib/notify'
import { userSchemas } from '@/lib/validation/schemas'
import { PasswordStrengthBar } from '@/components/ui/PasswordStrengthBar'

const registerFormSchema = userSchemas.register.extend({
  confirmPassword: z.string().min(1, 'Şifre tekrar gerekli'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Şifreler eşleşmiyor', path: ['confirmPassword'] })

type RegisterFormData = z.infer<typeof registerFormSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema) as Resolver<RegisterFormData>,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      role: 'user',
      job_title: '',
    },
  })

  async function onValid(data: RegisterFormData) {
    setError('')
    setLoading(true)
    const payload = {
      username: data.username,
      password: data.password,
      full_name: data.full_name ?? undefined,
      role: data.role ?? 'user',
      ...(data.email ? { email: data.email } : {}),
      ...(data.job_title ? { job_title: data.job_title } : {}),
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : json?.message || `Hata (${res.status}). Lütfen bilgileri kontrol edin.`
        setError(msg)
        setLoading(false)
        return
      }
      toast.success('Kayıt başarılı. Admin onayı bekleniyor; onaylandıktan sonra giriş yapabilirsiniz.')
      router.push('/auth/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.')
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

          <form onSubmit={handleSubmit(onValid)} className="space-y-4">
            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-username"
                  type="text"
                  {...registerField('username')}
                  aria-invalid={!!errors.username}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.username ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="Kullanıcı adı"
                />
              </div>
              {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-email"
                  type="email"
                  {...registerField('email')}
                  aria-invalid={!!errors.email}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="E-posta adresi"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-full_name" className="block text-sm font-medium text-gray-300 mb-2">
                Ad Soyad
              </label>
              <input
                id="reg-full_name"
                type="text"
                {...registerField('full_name')}
                aria-invalid={!!errors.full_name}
                className={`w-full px-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.full_name ? 'border-red-500' : 'border-gray-700'}`}
                placeholder="Ad Soyad (en az 2 karakter)"
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-role" className="block text-sm font-medium text-gray-300 mb-2">
                Rol *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                <select
                  id="reg-role"
                  {...registerField('role')}
                  aria-invalid={!!errors.role}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer ${errors.role ? 'border-red-500' : 'border-gray-700'}`}
                >
                  <option value="user">Kullanıcı</option>
                  <option value="manager">Yönetici</option>
                  <option value="viewer">Görüntüleyici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
            </div>
            <div>
              <label htmlFor="reg-job_title" className="block text-sm font-medium text-gray-300 mb-2">
                İş unvanı (isteğe bağlı)
              </label>
              <input
                id="reg-job_title"
                type="text"
                {...registerField('job_title')}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Usta, Depo Sorumlusu"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-password"
                  type="password"
                  {...registerField('password')}
                  aria-invalid={!!errors.password}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.password ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="En az 8 karakter, büyük/küçük harf ve rakam"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            <PasswordStrengthBar password={watch('password') ?? ''} />
            </div>

            <div>
              <label htmlFor="reg-confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre Tekrar *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-confirmPassword"
                  type="password"
                  {...registerField('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-900 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.confirmPassword ? 'border-red-500' : 'border-gray-700'}`}
                  placeholder="Şifreyi tekrar girin"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
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


