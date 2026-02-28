'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import trLocale from '@fullcalendar/core/locales/tr'

interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  sku: string
  quantity: number
  status: string
  current_station?: string | null
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

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await fetchApi<ProductionOrder[]>('/api/production')
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Event'leri dönüştür
  const events = orders.map(order => {
    const targetDate = order.due_date || order.estimated_completion_date || order.created_at
    let color = '#2563eb' // blue-600

    if (order.status === 'completed') {
      color = '#16a34a' // green-600
    } else if (order.status === 'cancelled') {
      color = '#4b5563' // gray-600
    } else if (order.status === 'in_progress') {
      color = '#d97706' // amber-600
    } else {
      const now = new Date()
      const dDate = order.due_date ? new Date(order.due_date) : null
      if (dDate && now > dDate) {
        color = '#dc2626' // red-600
      }
    }

    return {
      id: order.id,
      title: `${order.order_number} - ${order.quantity} Adet ${order.product_name}`,
      date: new Date(targetDate).toISOString().split('T')[0],
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        ...order
      }
    }
  })

  const handleEventClick = (info: any) => {
    const orderId = info.event.id
    router.push(`/production/${orderId}`)
  }

  return (
    <AppDashboardLayout
      title="Üretim ve Sevkiyat Takvimi"
      icon={CalendarIcon}
      subtitle="Tüm üretim emirleri ve teslimat tarihlerinin global takvim görünümü"
    >
      {/* Renk Açıklamaları */}
      <div className="bg-gray-900/50 backdrop-blur-md rounded-xl border border-white/5 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-600 rounded shadow-[0_0_10px_rgba(22,163,74,0.5)]"></div>
            <span className="text-gray-300 font-medium">Tamamlandı</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-600 rounded shadow-[0_0_10px_rgba(217,119,6,0.5)]"></div>
            <span className="text-gray-300 font-medium">Devam Ediyor</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
            <span className="text-gray-300 font-medium">Geciken</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
            <span className="text-gray-300 font-medium">Bekliyor</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400 animate-pulse font-medium">Takvim Yükleniyor...</p>
          </div>
        ) : (
          <div className="calendar-container relative z-10">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              locale={trLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
              }}
              events={events}
              eventClick={handleEventClick}
              height="auto"
              contentHeight={750}
              dayMaxEvents={3}
              eventClassNames="cursor-pointer transition-all hover:brightness-110 hover:shadow-lg rounded-md px-1 py-0.5 border-0 font-medium text-xs shadow-sm"
              viewClassNames="bg-transparent"
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        .calendar-container {
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255, 255, 255, 0.02);
          --fc-neutral-text-color: #9ca3af;
          --fc-border-color: rgba(255, 255, 255, 0.08);
          
          --fc-button-text-color: #e5e7eb;
          --fc-button-bg-color: rgba(255, 255, 255, 0.05);
          --fc-button-border-color: rgba(255, 255, 255, 0.1);
          --fc-button-hover-bg-color: rgba(255, 255, 255, 0.1);
          --fc-button-hover-border-color: rgba(255, 255, 255, 0.2);
          --fc-button-active-bg-color: rgba(59, 130, 246, 0.2);
          --fc-button-active-border-color: rgba(59, 130, 246, 0.5);
          
          --fc-event-bg-color: transparent;
          --fc-event-border-color: transparent;
          --fc-event-text-color: #fff;
          
          --fc-today-bg-color: rgba(59, 130, 246, 0.05);
          --fc-now-indicator-color: #ef4444;
          
          color: #f3f4f6;
          font-family: inherit;
        }
        
        .fc-theme-standard th {
          border: 1px solid var(--fc-border-color);
          padding: 12px 0;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          color: #9ca3af;
          background: rgba(0,0,0,0.2);
        }

        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }

        .fc .fc-button {
          border-radius: 8px;
          padding: 8px 16px;
          font-weight: 500;
          transition: all 0.2s;
          text-transform: capitalize;
        }

        .fc .fc-button-primary:not(:disabled).fc-button-active, 
        .fc .fc-button-primary:not(:disabled):active {
          background-color: var(--fc-button-active-bg-color);
          border-color: var(--fc-button-active-border-color);
          color: #60a5fa;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
        }

        .fc-daygrid-day-number {
          color: #d1d5db;
          font-weight: 500;
          padding: 8px !important;
        }

        .fc-day-today .fc-daygrid-day-number {
          color: #60a5fa;
          font-weight: 700;
        }
        
        .fc-list-event:hover td {
          background-color: rgba(255,255,255,0.05) !important;
        }

        .fc-list-day-cushion {
          background-color: rgba(0,0,0,0.3) !important;
        }
      `}</style>
    </AppDashboardLayout>
  )
}
