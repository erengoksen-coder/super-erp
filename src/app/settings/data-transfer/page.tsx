'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Upload, Download, ArrowLeft, FileUp } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'

type ImportType = 'accounts' | 'products' | null

export default function DataTransferPage() {
  const [importType, setImportType] = useState<ImportType>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; total: number; errors: string[] } | null>(null)
  const fileRefAccounts = useRef<HTMLInputElement>(null)
  const fileRefProducts = useRef<HTMLInputElement>(null)
  const user = useAuthStore((s) => s.user)
  const getAuthHeaders = () => ({ Authorization: `Bearer ${typeof window !== 'undefined' ? useAuthStore.getState().token : ''}` })

  async function downloadExport(path: string, filename: string) {
    try {
      const res = await fetch(path, { credentials: 'include', headers: getAuthHeaders() })
      if (!res.ok) {
        toast.error('İndirme yetkisi yok veya hata oluştu')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('İndirme tamamlandı')
    } catch {
      toast.error('İndirme başarısız')
    }
  }

  function getExportUrl(path: string) {
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !importType) return
    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/${importType}/import`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders() },
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'İçe aktarma başarısız')
        return
      }
      setResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        total: data.total ?? 0,
        errors: data.errors ?? [],
      })
      toast.success(`${data.created ?? 0} ekleme, ${data.updated ?? 0} güncelleme`)
    } finally {
      setUploading(false)
      if (importType === 'accounts' && fileRefAccounts.current) fileRefAccounts.current.value = ''
      if (importType === 'products' && fileRefProducts.current) fileRefProducts.current.value = ''
    }
  }

  return (
    <AppDashboardLayout
      title="Veri aktarımı"
      subtitle="Excel ile toplu dışa aktarma ve içe aktarma"
      icon={FileSpreadsheet}
    >
      <div className="mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Ayarlara dön
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dışa aktarma */}
        <Card>
          <CardHeader title="Dışa aktarma (Excel)" />
          <CardBody className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Aşağıdaki bağlantılarla mevcut verileri Excel olarak indirebilirsiniz.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => downloadExport('/api/orders/export?limit=5000', `siparisler_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm text-left"
              >
                <Download className="h-4 w-4" /> Siparişler
              </button>
              <button
                type="button"
                onClick={() => downloadExport('/api/accounts/export?limit=5000', `cari_hesaplar_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm text-left"
              >
                <Download className="h-4 w-4" /> Cari hesaplar
              </button>
              <button
                type="button"
                onClick={() => downloadExport('/api/products/export?limit=5000', `urunler_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm text-left"
              >
                <Download className="h-4 w-4" /> Ürünler
              </button>
              <button
                type="button"
                onClick={() => downloadExport('/api/materials/export', `malzemeler_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm text-left"
              >
                <Download className="h-4 w-4" /> Malzemeler
              </button>
              <button
                type="button"
                onClick={() => downloadExport('/api/invoices/export?limit=5000', `faturalar_${new Date().toISOString().split('T')[0]}.xlsx`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm text-left"
              >
                <Download className="h-4 w-4" /> Faturalar
              </button>
            </div>
          </CardBody>
        </Card>

        {/* İçe aktarma */}
        <Card>
          <CardHeader title="İçe aktarma (Excel)" />
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Şablonu indirip doldurduktan sonra yükleyin. Sipariş toplu yükleme için{' '}
              <Link href="/orders" className="text-blue-500 hover:underline">Siparişler</Link> sayfasındaki &quot;Toplu yükle&quot; kullanın.
            </p>

            {/* Sipariş */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Sipariş:</span>
              <a
                href={getExportUrl('/api/orders/import/template')}
                download
                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
              >
                <FileUp className="h-4 w-4" /> Şablon indir
              </a>
              <Link href="/orders" className="text-sm text-slate-400">→ Siparişler sayfasında yükle</Link>
            </div>

            {/* Cari */}
            <div>
              <span className="text-sm font-medium block mb-2">Cari hesaplar:</span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={getExportUrl('/api/accounts/import/template')}
                  download
                  className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                >
                  <FileUp className="h-4 w-4" /> Şablon indir
                </a>
                <Button
                  size="sm"
                  variant={importType === 'accounts' ? 'primary' : 'secondary'}
                  onClick={() => setImportType(importType === 'accounts' ? null : 'accounts')}
                >
                  {importType === 'accounts' ? 'İptal' : 'Dosya yükle'}
                </Button>
              </div>
              {importType === 'accounts' && (
                <div className="mt-2">
                  <input
                    ref={fileRefAccounts}
                    type="file"
                    accept=".xlsx,.xls"
                    className="text-sm"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </div>
              )}
            </div>

            {/* Ürünler */}
            <div>
              <span className="text-sm font-medium block mb-2">Ürünler:</span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={getExportUrl('/api/products/import/template')}
                  download
                  className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                >
                  <FileUp className="h-4 w-4" /> Şablon indir
                </a>
                <Button
                  size="sm"
                  variant={importType === 'products' ? 'primary' : 'secondary'}
                  onClick={() => setImportType(importType === 'products' ? null : 'products')}
                >
                  {importType === 'products' ? 'İptal' : 'Dosya yükle'}
                </Button>
              </div>
              {importType === 'products' && (
                <div className="mt-2">
                  <input
                    ref={fileRefProducts}
                    type="file"
                    accept=".xlsx,.xls"
                    className="text-sm"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </div>
              )}
            </div>

            {uploading && <p className="text-sm text-amber-500">Yükleniyor…</p>}
            {result && (
              <div className="p-3 rounded-lg bg-gray-800 text-sm">
                <p>Toplam satır: {result.total} — Eklenen: {result.created}, Güncellenen: {result.updated}</p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 text-amber-400 text-xs list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && <li>… ve {result.errors.length - 5} hata daha</li>}
                  </ul>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
