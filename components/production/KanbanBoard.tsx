import React from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/utils/dateFormat'
import { MoreHorizontal, Clock, User, Calendar, Package, Plus } from 'lucide-react'

export interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  sku?: string
  quantity: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  current_station?: string
  /** Usta Terminali ile entegre: bu siparişin kartlarının bulunduğu istasyonlar (aynı sipariş birden fazla sütunda görünebilir) */
  stations?: string[]
  started_at?: string
  estimated_completion?: string
  assigned_to?: string
  status: string
  created_at?: string
  product_id?: string
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  order_date?: string | null
  configuration?: string | null
  notes?: string | null
}

interface KanbanColumnProps {
  title: string
  status: string
  orders: ProductionOrder[]
  onOrderClick?: (order: ProductionOrder) => void
  className?: string
}

export const KanbanColumn = ({ 
  title, 
  status, 
  orders, 
  onOrderClick,
  className 
}: KanbanColumnProps) => {
  const statusColors = {
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    delayed: 'bg-red-50 text-red-700 border-red-200'
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  }

  return (
    <Card className={cn('min-h-[600px]', className)}>
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <Badge 
            variant="soft" 
            color="primary"
            className="text-xs"
          >
            {orders.length}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={cn(
                'cursor-pointer hover-lift transition-all duration-200',
                statusColors[order.status as keyof typeof statusColors]
              )}
              onClick={() => onOrderClick?.(order)}
              variant="flat"
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">
                      {order.order_number}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {order.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.sku}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Package className="w-3 h-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">
                      {order.quantity} adet
                    </span>
                  </div>
                  <Badge
                    size="sm"
                    variant="soft"
                    color={order.priority === 'urgent' ? 'error' : 
                           order.priority === 'high' ? 'warning' : 
                           order.priority === 'medium' ? 'primary' : 'secondary'}
                  >
                    {order.priority === 'urgent' ? 'Acil' :
                     order.priority === 'high' ? 'Yüksek' :
                     order.priority === 'medium' ? 'Orta' : 'Düşük'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {order.assigned_to && (
                    <div className="flex items-center space-x-2">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {order.assigned_to}
                      </span>
                    </div>
                  )}
                  
                  {order.estimated_completion && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {formatDate(order.estimated_completion)}
                      </span>
                    </div>
                  )}

                  {order.started_at && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        Başlangıç: {formatDate(order.started_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {order.current_station}
                    </span>
                    <Badge
                      size="sm"
                      variant="outline"
                      color="primary"
                    >
                      {order.status === 'pending' ? 'Bekliyor' :
                       order.status === 'in_progress' ? 'Devam Ediyor' :
                       order.status === 'completed' ? 'Tamamlandı' : 'Gecikti'}
                    </Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          
          {orders.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-sm">
                Bu istasyonda bekleyen üretim emri yok
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

interface KanbanBoardProps {
  orders: ProductionOrder[]
  onOrderClick?: (order: ProductionOrder) => void
  className?: string
}

export const KanbanBoard = ({ orders, onOrderClick, className }: KanbanBoardProps) => {
  const stations = [
    { id: 'iskelet', title: 'İskelet', status: 'iskelet' },
    { id: 'terzihane', title: 'Terzihane', status: 'terzihane' },
    { id: 'döseme', title: 'Döseme', status: 'döseme' },
    { id: 'montaj', title: 'Montaj', status: 'montaj' },
    { id: 'sevkiyat', title: 'Sevkiyat', status: 'sevkiyat' }
  ]

  // Usta Terminali / Genel Durum ile aynı veri: Sipariş, kartı bulunan her istasyon sütununda görünsün
  const getOrdersByStation = (station: string) => {
    return orders.filter(order =>
      (order.stations && order.stations.includes(station)) || order.current_station === station
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Üretim Panosu
        </h2>
        <div className="flex items-center space-x-3">
          <Button variant="solid" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim Emri
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 overflow-x-auto">
        {stations.map((station) => (
          <KanbanColumn
            key={station.id}
            title={station.title}
            status={station.status}
            orders={getOrdersByStation(station.id)}
            onOrderClick={onOrderClick}
            className="min-w-[280px]"
          />
        ))}
      </div>
    </div>
  )
}