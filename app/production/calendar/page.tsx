'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { KanbanBoard } from '@/components/production/KanbanBoard'
import { formatDate } from '@/lib/utils/dateFormat'

interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  sku: string
  quantity: number
  status: string
  current_station?: string | null
  /** Kartların bulunduğu istasyonlar (Usta Terminali ile entegre) */
  stations?: string[]
  created_at: string
  customer_name?: string | null
  dealer_name?: string | null
  configuration?: string | null
  order_date?: string | null
  due_date?: string
  estimated_completion_date?: string
  started_at?: string
  completed_at?: string
}

export default function ProductionCalendarPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'overdue'>('all')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await fetchApi<ProductionOrder[]>('/api/production')
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Haftalık görünüm için günleri al
  function getWeekDays(date: Date): Date[] {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Pazartesi başlangıcı
    const monday = new Date(date.setDate(diff))
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }

  // Aylık görünüm için günleri al
  function getMonthDays(date: Date): Date[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Ayın ilk gününden önceki boş günler
    const startDay = firstDay.getDay()
    const adjustedStart = startDay === 0 ? 6 : startDay - 1 // Pazartesi başlangıcı
    
    for (let i = 0; i < adjustedStart; i++) {
      const d = new Date(firstDay)
      d.setDate(d.getDate() - (adjustedStart - i))
      days.push(d)
    }
    
    // Ayın günleri
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Ayın son gününden sonraki boş günler (42 gün toplam)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(lastDay)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    
    return days
  }

  // Tarihe göre emirleri filtrele
  function getOrdersForDate(date: Date): ProductionOrder[] {
    const dateStr = date.toISOString().split('T')[0]
    return filteredOrders.filter(order => {
      const orderDate = order.due_date || order.estimated_completion_date || order.created_at
      const orderDateStr = new Date(orderDate).toISOString().split('T')[0]
      return orderDateStr === dateStr
    })
  }

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'completed') return order.status === 'completed'
    if (statusFilter === 'in_progress') return order.status === 'in_progress'
    if (statusFilter === 'overdue') {
      const now = new Date()
      const dueDate = order.due_date ? new Date(order.due_date) : null
      return Boolean(dueDate && now > dueDate && order.status !== 'completed')
    }
    return true
  })

  // Durum rengini belirle
  function getStatusColor(order: ProductionOrder): string {
    const now = new Date()
    const dueDate = order.due_date ? new Date(order.due_date) : null
    const estDate = order.estimated_completion_date ? new Date(order.estimated_completion_date) : null
    const targetDate = dueDate || estDate

    if (order.status === 'completed') {
      return 'bg-green-600 border-green-500'
    }
    
    if (order.status === 'cancelled') {
      return 'bg-gray-600 border-gray-500'
    }

    if (targetDate && now > targetDate && order.status !== 'completed') {
      return 'bg-red-600 border-red-500' // Geciken
    }

    if (order.status === 'in_progress') {
      return 'bg-yellow-600 border-yellow-500' // Devam eden
    }

    return 'bg-blue-600 border-blue-500' // Bekleyen
  }

  // Durum ikonunu belirle
  function getStatusIcon(order: ProductionOrder) {
    if (order.status === 'completed') {
      return <CheckCircle className="w-3 h-3" />
    }
    if (order.status === 'cancelled') {
      return <XCircle className="w-3 h-3" />
    }
    const now = new Date()
    const dueDate = order.due_date ? new Date(order.due_date) : null
    if (dueDate && now > dueDate) {
      return <AlertCircle className="w-3 h-3" />
    }
    return <Clock className="w-3 h-3" />
  }

  function previousPeriod() {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  function nextPeriod() {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const days = viewMode === 'week' ? getWeekDays(new Date(currentDate)) : getMonthDays(new Date(currentDate))
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

  const handleOrderClick = (order: import('@/components/production/KanbanBoard').ProductionOrder) => {
    router.push(`/production/${order.id}`)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Calendar className="w-8 h-8" />
            <span>Üretim Takvimi</span>
          </h1>
          <p className="text-gray-400">Üretim emirlerinin zaman çizelgesi ve durumu</p>
        </div>
      </div>

      <KanbanBoard orders={filteredOrders as import('@/components/production/KanbanBoard').ProductionOrder[]} onOrderClick={handleOrderClick} />

      {/* Kontroller */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={previousPeriod}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Bugün
            </button>
            <button
              onClick={nextPeriod}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            <div className="text-white font-semibold">
              {viewMode === 'week' 
                ? `${formatDate(days[0])} - ${formatDate(days[6])}`
                : `${String(currentDate.getMonth() + 1).padStart(2, '0')}.${currentDate.getFullYear()}`
              }
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Haftalık
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Aylık
            </button>
          </div>
        </div>
      </div>

      {/* Renk Açıklamaları */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span className="text-gray-300">Tamamlandı</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-600 rounded"></div>
            <span className="text-gray-300">Devam Ediyor</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-gray-300">Geciken</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-gray-300">Bekliyor</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {viewMode === 'week' ? (
            // Haftalık Görünüm
            <div className="grid grid-cols-7 gap-px bg-gray-800">
              {days.map((day, index) => {
                const dayOrders = getOrdersForDate(day)
                const isToday = day.toDateString() === new Date().toDateString()
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                
                return (
                  <div key={index} className="bg-gray-900 min-h-[400px]">
                    <div className={`p-2 border-b border-gray-800 ${isToday ? 'bg-blue-900/30' : ''}`}>
                      <div className="text-xs text-gray-400 mb-1">{weekDays[index]}</div>
                      <div className={`text-sm font-semibold ${isToday ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="p-2 space-y-2">
                      {dayOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`${getStatusColor(order)} text-white p-2 rounded text-xs border cursor-pointer hover:opacity-80 transition`}
                          title={`${order.order_number} - ${order.product_name} (${order.quantity} adet)`}
                        >
                          <div className="flex items-center space-x-1 mb-1">
                            {getStatusIcon(order)}
                            <span className="font-semibold truncate">{order.order_number}</span>
                          </div>
                          <div className="truncate">{order.product_name}</div>
                          <div className="text-xs opacity-75">{order.quantity} adet</div>
                          {order.status === 'in_progress' && (
                            <div className="mt-1 text-[10px] opacity-80 space-y-0.5">
                              {(order.customer_name || order.dealer_name) && (
                                <div className="truncate">
                                  {order.customer_name || order.dealer_name}
                                </div>
                              )}
                              {order.configuration && (
                                <div className="truncate">Parça: {order.configuration}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Aylık Görünüm
            <div>
              {/* Gün başlıkları */}
              <div className="grid grid-cols-7 gap-px bg-gray-800">
                {weekDays.map((day, index) => (
                  <div key={index} className="bg-gray-800 p-2 text-center">
                    <div className="text-xs font-semibold text-gray-300">{day}</div>
                  </div>
                ))}
              </div>
              {/* Günler */}
              <div className="grid grid-cols-7 gap-px bg-gray-800">
                {days.map((day, index) => {
                  const dayOrders = getOrdersForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                  
                  return (
                    <div
                      key={index}
                      className={`bg-gray-900 min-h-[120px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div className={`p-1 ${isToday ? 'bg-blue-900/30' : ''}`}>
                        <div className={`text-xs font-semibold ${isToday ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-gray-600'}`}>
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="p-1 space-y-1">
                        {dayOrders.slice(0, 3).map((order) => (
                          <div
                            key={order.id}
                            className={`${getStatusColor(order)} text-white p-1 rounded text-[10px] border cursor-pointer hover:opacity-80 transition truncate`}
                            title={`${order.order_number} - ${order.product_name} (${order.quantity} adet)`}
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(order)}
                              <span className="truncate">{order.order_number}</span>
                            </div>
                            {order.status === 'in_progress' && (order.customer_name || order.dealer_name) && (
                              <div className="truncate text-[9px] opacity-80">
                                {order.customer_name || order.dealer_name}
                              </div>
                            )}
                          </div>
                        ))}
                        {dayOrders.length > 3 && (
                          <div className="text-[10px] text-gray-400 px-1">
                            +{dayOrders.length - 3} daha
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`bg-gray-900 rounded-lg border border-gray-800 p-4 text-left transition ${
            statusFilter === 'all' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-800'
          }`}
        >
          <div className="text-sm text-gray-400 mb-1">Toplam Emir</div>
          <div className="text-2xl font-bold text-white">{orders.length}</div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`bg-gray-900 rounded-lg border border-gray-800 p-4 text-left transition ${
            statusFilter === 'completed' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-800'
          }`}
        >
          <div className="text-sm text-gray-400 mb-1">Tamamlandı</div>
          <div className="text-2xl font-bold text-green-400">
            {orders.filter((o) => o.status === 'completed').length}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`bg-gray-900 rounded-lg border border-gray-800 p-4 text-left transition ${
            statusFilter === 'in_progress' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-800'
          }`}
        >
          <div className="text-sm text-gray-400 mb-1">Devam Ediyor</div>
          <div className="text-2xl font-bold text-yellow-400">
            {orders.filter((o) => o.status === 'in_progress').length}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('overdue')}
          className={`bg-gray-900 rounded-lg border border-gray-800 p-4 text-left transition ${
            statusFilter === 'overdue' ? 'ring-2 ring-blue-500' : 'hover:bg-gray-800'
          }`}
        >
          <div className="text-sm text-gray-400 mb-1">Geciken</div>
          <div className="text-2xl font-bold text-red-400">
            {orders.filter((o) => {
              const now = new Date()
              const dueDate = o.due_date ? new Date(o.due_date) : null
              return dueDate && now > dueDate && o.status !== 'completed'
            }).length}
          </div>
        </button>
      </div>
    </div>
  )
}


