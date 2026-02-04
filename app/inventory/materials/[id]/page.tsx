'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PackageSearch, ArrowLeft, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'

type MaterialDetail = {
  id: string
  name: string
  code?: string | null
  stock_amount: number
  min_stock_level: number
  unit: string
  category?: string | null
  unit_price?: number | null
}

type StockMovement = {
  id: string
  movement_type: string
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
  user_name: string | null
  date: string
  time: string
}

export default function InventoryMaterialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : ''
    if (!id) {
      setError('Malzeme ID bulunamadı.')
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchApi<MaterialDetail>(`/api/inventory/materials/${id}`)
        if (!cancelled) {
          setMaterial(data ?? null)
        }
      } catch (err: any) {
        try {
          const list = await fetchApi<MaterialDetail[]>(`/api/inventory/materials`)
          const fallback = Array.isArray(list)
            ? list.find((item) => item.id === id || item.code === id)
            : null
          if (!cancelled) {
            if (fallback) {
              setMaterial(fallback)
              setError(null)
            } else {
              setError(err?.message || 'Malzeme bilgisi alınamadı.')
            }
          }
        } catch {
          if (!cancelled) {
            setError(err?.message || 'Malzeme bilgisi alınamadı.')
          }
        }
      }

      try {
        const movementsData = await fetchApi<{ movements: StockMovement[] }>(`/api/materials/${id}/movements`)
        if (!cancelled && movementsData?.movements) {
          setMovements(movementsData.movements)
        }
      } catch (err: any) {
        console.error('Hareket geçmişi yüklenemedi:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [params])

  if (loading) {
    return (
      <AppDashboardLayout title="Malzeme Detayı" subtitle="Yükleniyor..." icon={PackageSearch}>
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-gray-800" />
          <div className="h-32 rounded-xl bg-gray-800" />
        </div>
      </AppDashboardLayout>
    )
  }

  if (error || !material) {
    return (
      <AppDashboardLayout title="Malzeme Detayı" subtitle="Malzeme bulunamadı" icon={PackageSearch}>
        <Card>
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-400">{error || 'Malzeme bulunamadı.'}</p>
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri dön
            </Button>
          </CardBody>
        </Card>
      </AppDashboardLayout>
    )
  }

  const isCritical = material.stock_amount <= material.min_stock_level

  const filteredMovements = movements.filter((m) => {
    if (activeTab === 'all') return true
    if (activeTab === 'in') return m.movement_type === 'in'
    if (activeTab === 'out') return m.movement_type === 'out'
    return true
  })

  return (
    <AppDashboardLayout
      title={material.name}
      subtitle={material.code ? `Kod: ${material.code}` : 'Malzeme detayı'}
      icon={PackageSearch}
      actions={
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri dön
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {material.category && <Badge variant="soft" color="secondary">{material.category}</Badge>}
              {isCritical && <Badge variant="soft" color="error">Kritik stok</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-400">Mevcut Stok</div>
                <div className="text-xl font-semibold text-white">
                  {material.stock_amount} {material.unit}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Min. Stok</div>
                <div className="text-xl font-semibold text-white">
                  {material.min_stock_level} {material.unit}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Birim Fiyat</div>
                <div className="text-lg font-semibold text-white">
                  {typeof material.unit_price === 'number' ? `₺${material.unit_price.toFixed(2)}` : '—'}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-700 pb-4">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'in'
                    ? 'bg-green-900/30 text-green-400 border border-green-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('in')}
              >
                <ArrowDownCircle className="w-4 h-4 inline-block mr-2" />
                Stok Girişi
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'out'
                    ? 'bg-red-900/30 text-red-400 border border-red-700'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('out')}
              >
                <ArrowUpCircle className="w-4 h-4 inline-block mr-2" />
                Stok Çıkışı
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-gray-700 text-white border border-gray-600'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab('all')}
              >
                İptal
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2">Tarih</th>
                    <th className="py-2">Saat</th>
                    <th className="py-2">Miktar</th>
                    <th className="py-2">Durum</th>
                    <th className="py-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="border-t border-gray-800 text-gray-200"
                    >
                      <td className="py-2">{movement.date}</td>
                      <td className="py-2">{movement.time}</td>
                      <td className="py-2">
                        <span
                          className={`font-semibold ${
                            movement.movement_type === 'in' ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {movement.movement_type === 'in' ? '+' : '-'}
                          {movement.quantity} {material.unit}
                        </span>
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="soft"
                          color={movement.movement_type === 'in' ? 'success' : 'error'}
                        >
                          {movement.movement_type === 'in' ? 'Giriş' : 'Çıkış'}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-gray-400">
                        {movement.reference_type && (
                          <span>{movement.reference_type}: {movement.reference_id}</span>
                        )}
                        {movement.notes && <span className="block">{movement.notes}</span>}
                      </td>
                    </tr>
                  ))}
                  {!filteredMovements.length && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-gray-400">
                        Hareket kaydı bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
