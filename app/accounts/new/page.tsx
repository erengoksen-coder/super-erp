'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, X } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'
import { accountSchema } from '@/lib/validation/scm-schema'
import type { z } from 'zod'

type AccountFormData = z.infer<typeof accountSchema>

const defaultValues: AccountFormData = {
  code: '',
  name: '',
  type: 'customer',
  tax_number: '',
  phone: '',
  email: '',
  address: '',
  risk_limit: 0,
  discount_rate: 0,
  authorized_person_name: '',
  authorized_person_phone: '',
}

export default function NewAccountPage() {
  const router = useRouter()
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as Resolver<AccountFormData>,
    defaultValues,
  })

  async function onValid(data: AccountFormData) {
    setLoading(true)
    try {
      await fetchApi('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: data.code,
          name: data.name,
          type: data.type,
          tax_number: data.tax_number || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          risk_limit: data.risk_limit ?? 0,
          discount_rate: data.discount_rate ?? 0,
          authorized_person_name: data.authorized_person_name || null,
          authorized_person_phone: data.authorized_person_phone || null,
          created_by: userId,
        }),
      })
      router.push('/accounts')
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      if (errorMessage.includes('no such column')) {
        errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
      } else if (errorMessage.includes('UNIQUE constraint')) {
        errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
      } else if (errorMessage.includes('FOREIGN KEY')) {
        errorMessage = 'İlişkili kayıt bulunamadı.'
      } else if (errorMessage.includes('NOT NULL')) {
        errorMessage = 'Zorunlu alanlar eksik.'
      }
      toast.error('Hata: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/accounts" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Cari Hesap</h1>
        <p className="text-gray-400 mt-1">Müşteri veya tedarikçi ekleyin</p>
      </div>

      <form onSubmit={handleSubmit(onValid)} className="bg-gray-900 rounded-lg border border-gray-800 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cari Kodu <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('code')}
              aria-invalid={!!errors.code}
              className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.code ? 'border-red-500' : 'border-gray-700'}`}
              placeholder="Örn: M-001"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-400">{errors.code.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ad/Ünvan <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              aria-invalid={!!errors.name}
              className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-700'}`}
              placeholder="Müşteri veya tedarikçi adı"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tip <span className="text-red-400">*</span>
          </label>
          <select
            {...register('type')}
            aria-invalid={!!errors.type}
            className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.type ? 'border-red-500' : 'border-gray-700'}`}
          >
            <option value="customer">Müşteri</option>
            <option value="vendor">Tedarikçi</option>
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Risk Limiti (₺)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('risk_limit')}
            aria-invalid={!!errors.risk_limit}
            className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.risk_limit ? 'border-red-500' : 'border-gray-700'}`}
            placeholder="Örn: 100000"
          />
          {errors.risk_limit && (
            <p className="mt-1 text-sm text-red-400">{errors.risk_limit.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Vergi No / TC Kimlik No
          </label>
          <input
            type="text"
            {...register('tax_number')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Vergi numarası veya TC kimlik no"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Telefon
          </label>
          <input
            type="tel"
            {...register('phone')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Telefon numarası"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            E-posta
          </label>
          <input
            type="email"
            {...register('email')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-700'}`}
            placeholder="E-posta adresi"
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-400">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Adres
          </label>
          <textarea
            rows={3}
            {...register('address')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Adres bilgisi"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            İskonto Oranı (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...register('discount_rate')}
            aria-invalid={!!errors.discount_rate}
            className={`w-full px-4 py-2 bg-gray-800 border text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.discount_rate ? 'border-red-500' : 'border-gray-700'}`}
            placeholder="Örn: 5.00"
          />
          {errors.discount_rate && (
            <p className="mt-1 text-sm text-red-400">{errors.discount_rate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Yetkili Kişi Adı
          </label>
          <input
            type="text"
            {...register('authorized_person_name')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Yetkili kişi adı"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Yetkili Kişi Telefonu
          </label>
          <input
            type="tel"
            {...register('authorized_person_phone')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Yetkili kişi telefonu"
          />
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
          <Link
            href="/accounts"
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span>İptal</span>
          </Link>
        </div>
      </form>
    </div>
  )
}
