import React from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface StatWidgetProps {
  title: string
  value: string | number
  change?: {
    value: string
    type: 'increase' | 'decrease' | 'neutral'
  }
  icon?: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'error'
  loading?: boolean
  className?: string
}

export const StatWidget = ({
  title,
  value,
  change,
  icon,
  color = 'primary',
  loading = false,
  className
}: StatWidgetProps) => {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    error: 'text-red-600 bg-red-50'
  }

  return (
    <Card className={cn('hover-lift transition-all duration-200', className)}>
      <CardBody className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className="flex items-center space-x-1">
                <span
                  className={cn(
                    'text-xs font-medium',
                    change.type === 'increase' && 'text-emerald-600',
                    change.type === 'decrease' && 'text-red-600',
                    change.type === 'neutral' && 'text-gray-500'
                  )}
                >
                  {change.type === 'increase' && '↑'}
                  {change.type === 'decrease' && '↓'}
                  {change.type === 'neutral' && '→'}
                  {change.value}
                </span>
                <span className="text-xs text-gray-500">dün</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-3 rounded-xl', colorClasses[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

interface ChartWidgetProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  loading?: boolean
  className?: string
}

export const ChartWidget = ({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  className
}: ChartWidgetProps) => {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader title={title} subtitle={subtitle} />
        <CardBody>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={cn('hover-lift transition-all duration-200', className)}>
      <CardHeader
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      <CardBody>
        <div className="h-64">
          {children}
        </div>
      </CardBody>
    </Card>
  )
}

interface ListWidgetProps {
  title: string
  items: Array<{
    id: string
    title: string
    subtitle?: string
    status?: string
    statusColor?: 'primary' | 'success' | 'warning' | 'error'
    avatar?: React.ReactNode
    actions?: React.ReactNode
  }>
  loading?: boolean
  empty?: string
  className?: string
}

export const ListWidget = ({
  title,
  items,
  loading = false,
  empty = 'Veri bulunamadı',
  className
}: ListWidgetProps) => {
  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader title={title} />
        <CardBody>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className={cn('hover-lift transition-all duration-200', className)}>
      <CardHeader title={`${title} (${items.length})`} />
      <CardBody>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {empty}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                {item.avatar && (
                  <div className="flex-shrink-0">
                    {item.avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className="text-sm text-gray-500 truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {item.status && (
                    <Badge
                      size="sm"
                      color={item.statusColor || 'primary'}
                      variant="soft"
                    >
                      {item.status}
                    </Badge>
                  )}
                  {item.actions && item.actions}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

interface GridWidgetProps {
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const GridWidget = ({
  title,
  children,
  actions,
  className
}: GridWidgetProps) => {
  return (
    <Card className={cn('hover-lift transition-all duration-200', className)}>
      <CardHeader
        title={title}
        actions={actions}
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children}
        </div>
      </CardBody>
    </Card>
  )
}