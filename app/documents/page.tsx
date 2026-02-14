'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Upload, Search, Trash2, Download } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

const CATEGORIES = [
  { value: '', label: 'Tümü' },
  { value: 'sozlesme', label: 'Sözleşme' },
  { value: 'fatura', label: 'Fatura kopyası' },
  { value: 'sertifika', label: 'Sertifika' },
  { value: 'teknik', label: 'Teknik doküman' },
  { value: 'diger', label: 'Diğer' },
]

type DocumentItem = {
  id: string
  title: string
  category: string | null
  file_name: string
  file_size: number | null
  mime_type: string | null
  related_type: string | null
  related_id: string | null
  created_by: string | null
  created_at: string
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '–'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [list, setList] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('diger')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search.trim()) params.set('search', search.trim())
      const data = await fetchApi<DocumentItem[]>(`/api/documents?${params.toString()}`)
      setList(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e?.message || 'Liste yüklenemedi')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !uploadTitle.trim()) {
      toast.error('Başlık ve dosya gerekli')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', uploadTitle.trim())
      formData.append('category', uploadCategory || 'diger')
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Yükleme başarısız')
      }
      toast.success('Doküman yüklendi')
      setUploadTitle('')
      setUploadFile(null)
      loadList()
    } catch (e: any) {
      toast.error(e?.message || 'Yükleme hatası')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu dokümanı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Silinemedi')
      toast.success('Silindi')
      loadList()
    } catch {
      toast.error('Silme hatası')
    }
  }

  function getDownloadUrl(id: string) {
    return `/api/documents/${id}?download=1`
  }

  const categoryLabel = (c: string | null) => CATEGORIES.find((x) => x.value === c)?.label || c || '–'

  return (
    <AppDashboardLayout
      title="Doküman Yönetimi"
      subtitle="Evrak yükleme, kategorilere göre listeleme ve arama"
      icon={FileText}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Yeni doküman yükle</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px]">
                <label className="mb-1 block text-sm text-gray-400">Başlık</label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Örn. Tedarik sözleşmesi"
                  className="bg-gray-800 text-white"
                />
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-sm text-gray-400">Kategori</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  {CATEGORIES.filter((x) => x.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[220px]">
                <label className="mb-1 block text-sm text-gray-400">Dosya (PDF, resim)</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white"
                />
              </div>
              <Button type="submit" disabled={uploading || !uploadFile || !uploadTitle.trim()}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Yükleniyor…' : 'Yükle'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Doküman listesi</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Başlık veya dosya adı..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 bg-gray-800 pl-8 text-white"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
              >
                {CATEGORIES.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-gray-400">Yükleniyor…</p>
            ) : list.length === 0 ? (
              <p className="text-gray-400">Doküman bulunamadı. Yukarıdan yükleyebilirsiniz.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="pb-2 pr-4">Başlık</th>
                      <th className="pb-2 pr-4">Kategori</th>
                      <th className="pb-2 pr-4">Dosya</th>
                      <th className="pb-2 pr-4">Boyut</th>
                      <th className="pb-2 pr-4">Tarih</th>
                      <th className="pb-2 pr-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-800">
                        <td className="py-2 pr-4 font-medium text-white">{doc.title}</td>
                        <td className="py-2 pr-4 text-gray-300">{categoryLabel(doc.category)}</td>
                        <td className="py-2 pr-4 text-gray-300">{doc.file_name}</td>
                        <td className="py-2 pr-4 text-gray-400">{formatBytes(doc.file_size)}</td>
                        <td className="py-2 pr-4 text-gray-400">{formatDate(doc.created_at)}</td>
                        <td className="py-2 pr-4 text-right">
                          <a
                            href={getDownloadUrl(doc.id)}
                            download
                            className="mr-2 inline-flex text-blue-400 hover:underline"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="inline-flex text-red-400 hover:underline"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
