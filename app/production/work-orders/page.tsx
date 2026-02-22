'use client'

import { useEffect, useMemo, useState } from 'react'
import { Factory, RefreshCw, PlusCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { LogoWithBackground } from '@/components/Logo'

type ProductionOrder = {
  id: string
  order_number: string
  product_name: string
  sku: string
  status: string
}

type WorkOrderRow = {
  id: string
  production_order_id: string
  work_order_number: string
  status: string
  planned_start_date: string | null
  planned_end_date: string | null
  notes: string | null
  production_order_number: string
  production_order_status: string
  product_name: string | null
  product_sku: string | null
}

type WorkOrderOperation = {
  id: string
  station: string
  status: string
  started_at: string | null
  completed_at: string | null
}

type WorkOrderDetail = WorkOrderRow & { operations: WorkOrderOperation[] }

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([])
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [selectedProductionOrder, setSelectedProductionOrder] = useState<string>('')
  const [plannedStartDate, setPlannedStartDate] = useState<string>('')
  const [plannedEndDate, setPlannedEndDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null)
  const [workOrderDetail, setWorkOrderDetail] = useState<WorkOrderDetail | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [workOrdersData, productionOrdersData] = await Promise.all([
        fetchApi<WorkOrderRow[]>('/api/work-orders'),
        fetchApi<ProductionOrder[]>('/api/production'),
      ])
      setWorkOrders(workOrdersData)
      setProductionOrders(productionOrdersData)
      if (!selectedProductionOrder && productionOrdersData.length > 0) {
        setSelectedProductionOrder(productionOrdersData[0].id)
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedWorkOrder = useMemo(() => {
    return workOrders.find((item) => item.id === selectedWorkOrderId) || null
  }, [workOrders, selectedWorkOrderId])

  async function handleCreateWorkOrder() {
    if (!selectedProductionOrder) {
      toast.warning('Lütfen üretim emri seçin')
      return
    }
    setCreating(true)
    try {
      await fetchApi('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: selectedProductionOrder,
          planned_start_date: plannedStartDate || null,
          planned_end_date: plannedEndDate || null,
          notes: notes || null,
        }),
      })
      setPlannedStartDate('')
      setPlannedEndDate('')
      setNotes('')
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || 'İş emri oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }

  async function handleSelectWorkOrder(id: string) {
    setSelectedWorkOrderId(id)
    try {
      const detail = await fetchApi<WorkOrderDetail>(`/api/work-orders/${id}`)
      setWorkOrderDetail(detail)
    } catch (error) {
      console.error('Detay yüklenirken hata:', error)
      setWorkOrderDetail(null)
    }
  }

  async function updateOperationStatus(station: string, status: string) {
    if (!workOrderDetail) return
    try {
      await fetchApi(`/api/work-orders/${workOrderDetail.id}/operations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, status }),
      })
      await handleSelectWorkOrder(workOrderDetail.id)
    } catch (error: any) {
      toast.error(error?.message || 'Operasyon güncellenemedi')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <Factory className="w-8 h-8 text-lime-400" />
              <span>İş Emirleri ve Operasyon Takibi</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400">Üretim emirlerinden iş emri oluşturun ve operasyon durumlarını izleyin</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Üretim Emri</label>
            <select
              value={selectedProductionOrder}
              onChange={(event) => setSelectedProductionOrder(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="">Üretim emri seçin</option>
              {productionOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_number} - {order.product_name} ({order.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Plan Başlangıç</label>
            <input
              type="date"
              value={plannedStartDate}
              onChange={(event) => setPlannedStartDate(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Plan Bitiş</label>
            <input
              type="date"
              value={plannedEndDate}
              onChange={(event) => setPlannedEndDate(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm text-gray-400 mb-1">Not</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
              placeholder="İş emri notu"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreateWorkOrder}
              disabled={creating}
              className="w-full px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-500 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{creating ? 'Oluşturuluyor...' : 'İş Emri Oluştur'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 text-gray-200 font-medium">İş Emirleri</div>
          <div className="divide-y divide-gray-800">
            {workOrders.map((workOrder) => {
              const isActive = workOrder.id === selectedWorkOrderId
              return (
                <button
                  key={workOrder.id}
                  onClick={() => handleSelectWorkOrder(workOrder.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-800/60 transition ${
                    isActive ? 'bg-gray-800/70' : ''
                  }`}
                >
                  <div className="text-white font-medium">{workOrder.work_order_number}</div>
                  <div className="text-xs text-gray-400">
                    {workOrder.production_order_number} · {workOrder.product_name || '—'}
                  </div>
                  <div className="text-xs text-lime-400 mt-1">{workOrder.status}</div>
                </button>
              )
            })}
            {workOrders.length === 0 && (
              <div className="px-4 py-6 text-gray-400 text-sm text-center">İş emri bulunamadı</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          {workOrderDetail ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">İş Emri</div>
                <div className="text-white font-semibold">{workOrderDetail.work_order_number}</div>
                <div className="text-xs text-gray-400">
                  Üretim: {workOrderDetail.production_order_number} · {workOrderDetail.product_name || '—'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-400">Operasyonlar</div>
                <div className="space-y-2">
                  {workOrderDetail.operations.map((operation) => (
                    <div key={operation.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-gray-800/40 rounded-lg px-3 py-2">
                      <div className="flex-1">
                        <div className="text-white font-medium">{operation.station}</div>
                        <div className="text-xs text-gray-400">Durum: {operation.status}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateOperationStatus(operation.station, 'pending')}
                          className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                        >
                          Beklemede
                        </button>
                        <button
                          onClick={() => updateOperationStatus(operation.station, 'in_progress')}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                        >
                          Başladı
                        </button>
                        <button
                          onClick={() => updateOperationStatus(operation.station, 'completed')}
                          className="px-2 py-1 text-xs rounded bg-lime-600 text-white hover:bg-lime-500"
                        >
                          Tamamlandı
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Detay için iş emri seçin.</div>
          )}
        </div>
      </div>
    </div>
  )
}
