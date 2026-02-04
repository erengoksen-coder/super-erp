'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'

type FixedAsset = {
  id: string
  name: string
  code: string
  category: string
  acquisition_date: string
  acquisition_cost: number
  useful_life_years: number
  depreciation_method: string
  location?: string | null
  status: string
}

export default function FixedAssetsClient() {
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  async function loadAssets() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<FixedAsset[]>('/api/fixed-assets')
      setAssets(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Varlıklar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      !search ||
      asset.name.toLowerCase().includes(search) ||
      asset.code.toLowerCase().includes(search) ||
      asset.category.toLowerCase().includes(search)
    return matchesCategory && matchesSearch
  })

  const categories = Array.from(new Set(assets.map((a) => a.category)))

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Varlık Kartları ve Lokasyon Takibi" subtitle="Sabit kıymet envanteri" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Varlık ara (ad / kod / kategori)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={loadAssets} disabled={loading}>
              Yenile
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Kod</th>
                  <th className="py-2">Varlık Adı</th>
                  <th className="py-2">Kategori</th>
                  <th className="py-2">Edinim Tarihi</th>
                  <th className="py-2 text-right">Maliyet</th>
                  <th className="py-2">Lokasyon</th>
                  <th className="py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-t border-gray-800 text-gray-200 hover:bg-gray-800/60"
                  >
                    <td className="py-2">{asset.code}</td>
                    <td className="py-2">{asset.name}</td>
                    <td className="py-2">{asset.category}</td>
                    <td className="py-2">{new Date(asset.acquisition_date).toLocaleDateString('tr-TR')}</td>
                    <td className="py-2 text-right">₺{asset.acquisition_cost.toLocaleString('tr-TR')}</td>
                    <td className="py-2">{asset.location || '—'}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        asset.status === 'active' ? 'bg-green-900/30 text-green-400' :
                        asset.status === 'retired' ? 'bg-gray-700 text-gray-400' :
                        'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredAssets.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400">
                      Varlık bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Amortisman Planları" subtitle="Yıllık amortisman hesaplamaları" />
        <CardBody>
          <p className="text-sm text-gray-400">
            Amortisman hesaplamaları için veri entegrasyonu devam ediyor.
          </p>
        </CardBody>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Bakım ve Servis Kayıtları" subtitle="Bakım ve onarım takibi" />
        <CardBody>
          <p className="text-sm text-gray-400">
            Bakım kayıtları modülü yakında eklenecek.
          </p>
        </CardBody>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Değerleme Raporları" subtitle="Varlık değerleme ve analiz raporları" />
        <CardBody>
          <p className="text-sm text-gray-400">
            Değerleme raporları için analiz araçları hazırlanıyor.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
