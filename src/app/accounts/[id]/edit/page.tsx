'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save, X, ArrowLeft, Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'
import { accountSchema } from '@/lib/validation/scm-schema'
import type { z } from 'zod'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

type AccountFormData = z.infer<typeof accountSchema>

export default function EditAccountPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as Resolver<AccountFormData>,
  })

  useEffect(() => {
    if (id) {
      loadAccount()
    }
  }, [id])

  async function loadAccount() {
    setFetching(true)
    try {
      const data = await fetchApi<any>(`/api/accounts/${id}`)
      reset({
        code: data.code,
        name: data.name,
        type: data.type,
        tax_number: data.tax_number || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        risk_limit: data.risk_limit || 0,
        discount_rate: data.discount_rate || 0,
        authorized_person_name: data.authorized_person_name || '',
        authorized_person_phone: data.authorized_person_phone || '',
      })
    } catch (e: any) {
      toast.error('Cari bilgileri yüklenemedi')
      router.push('/accounts')
    } finally {
      setFetching(false)
    }
  }

  async function onValid(data: AccountFormData) {
    setLoading(true)
    try {
      await fetchApi(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tax_number: data.tax_number || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          authorized_person_name: data.authorized_person_name || null,
          authorized_person_phone: data.authorized_person_phone || null,
          updated_by: userId,
        }),
      })
      toast.success('Cari hesap başarıyla güncellendi')
      router.push('/accounts')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <AppDashboardLayout title="Cari Kart Düzenle" icon={Save}>
         <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <div className="text-center opacity-40 font-black uppercase tracking-widest text-sm">Veriler Çekiliyor...</div>
         </div>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout
      title="Cari Hesap Düzenle"
      subtitle="Mevcut müşteri veya tedarikçi bilgilerini güncelleyin"
      icon={Save}
      actions={
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto pb-20">
        <Card variant="glass" className="animate-reveal">
          <CardBody className="p-8">
            <form onSubmit={handleSubmit(onValid)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Cari Kodu <span className="text-red-500">*</span></label>
                  <Input
                    {...register('code')}
                    error={errors.code?.message}
                    placeholder="Örn: M-001"
                    variant="filled"
                    className="font-mono font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Ad/Ünvan <span className="text-red-500">*</span></label>
                  <Input
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="Müşteri veya tedarikçi adı"
                    variant="filled"
                    className="font-bold uppercase tracking-tight"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Tip <span className="text-red-500">*</span></label>
                  <select
                    {...register('type')}
                    className={cn(
                      "w-full h-12 px-4 rounded-xl bg-white/5 border border-white/5 text-foreground font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all",
                      errors.type && "border-error/50"
                    )}
                  >
                    <option value="customer" className="bg-slate-900">Müşteri</option>
                    <option value="vendor" className="bg-slate-900">Tedarikçi</option>
                  </select>
                  {errors.type && <p className="text-[10px] text-error font-bold mt-1 text-right uppercase">{errors.type.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Risk Limiti (₺)</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('risk_limit')}
                    error={errors.risk_limit?.message}
                    variant="filled"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Vergi No / TCKN</label>
                  <Input
                    {...register('tax_number')}
                    variant="filled"
                    placeholder="10 veya 11 hane"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">İskonto Oranı (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('discount_rate')}
                    error={errors.discount_rate?.message}
                    variant="filled"
                  />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Telefon</label>
                   <Input {...register('phone')} variant="filled" type="tel" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">E-posta</label>
                   <Input {...register('email')} variant="filled" type="email" error={errors.email?.message} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Yetkili Kişi</label>
                   <Input {...register('authorized_person_name')} variant="filled" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Yetkili Telefon</label>
                   <Input {...register('authorized_person_phone')} variant="filled" type="tel" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Adres</label>
                <textarea
                  {...register('address')}
                  rows={3}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/5 text-foreground font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all uppercase text-xs"
                  placeholder="Sevk ve fatura adresi"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Link href="/accounts" className="flex-1">
                  <Button variant="soft" color="secondary" className="w-full" type="button">
                    <X className="w-4 h-4 mr-2" />
                    İptal
                  </Button>
                </Link>
                <Button variant="solid" color="primary" className="flex-[2] shadow-lg shadow-primary/20" type="submit" loading={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Güncellemeleri Kaydet
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
