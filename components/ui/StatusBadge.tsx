'use client'

import React from 'react'
import { cn } from '@/lib/cn'

export type StatusBadgeType = 'invoice' | 'order' | 'shipment'

const CONFIG: Record<
  StatusBadgeType,
  Record<string, { label: string; className: string }>
> = {
  invoice: {
    issued: { label: 'Kesildi', className: 'bg-green-900/40 text-green-300 border border-green-700/50' },
    cancelled: { label: 'İptal', className: 'bg-red-900/40 text-red-300 border border-red-700/50' },
  },
  order: {
    pending: { label: 'Beklemede', className: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50' },
    in_production: { label: 'Üretimde', className: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
    completed: { label: 'Tamamlandı', className: 'bg-green-900/40 text-green-300 border border-green-700/50' },
    cancelled: { label: 'İptal Edildi', className: 'bg-red-900/40 text-red-300 border border-red-700/50' },
  },
  shipment: {
    pending: { label: 'Beklemede', className: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50' },
    in_transit: { label: 'Yolda', className: 'bg-blue-900/40 text-blue-300 border border-blue-700/50' },
    delivered: { label: 'Teslim Edildi', className: 'bg-green-900/40 text-green-300 border border-green-700/50' },
    cancelled: { label: 'İptal', className: 'bg-red-900/40 text-red-300 border border-red-700/50' },
  },
}

const DEFAULT = { label: '—', className: 'bg-gray-800 text-gray-400 border border-gray-600' }

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: StatusBadgeType
  status: string
}

export function StatusBadge({ type, status, className, ...props }: StatusBadgeProps) {
  const normalized = (status || '').trim().toLowerCase()
  const config = CONFIG[type]?.[normalized] ?? DEFAULT
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.className, className)}
      {...props}
    >
      {config.label}
    </span>
  )
}
