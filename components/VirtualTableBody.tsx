'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/cn'

type RowRenderProps<T> = {
  row: T
  index: number
}

interface VirtualTableBodyProps<T> {
  /** Tüm satır verileri */
  rows: T[]
  /** Sabit satır yüksekliği (px) */
  rowHeight?: number
  /** Görünür alanın tahmini yüksekliği (px); scroll container height */
  estimateSize?: number
  /** Her satırı render eden fonksiyon */
  renderRow: (props: RowRenderProps<T>) => React.ReactNode
  /** Tablo body için ek className */
  className?: string
  /** Key extractor */
  getRowKey: (row: T, index: number) => string
}

/**
 * Büyük listelerde sadece görünen satırları render eder (sanal kaydırma).
 * Kullanım: <table><thead>...</thead><VirtualTableBody rows={items} getRowKey={(r,i)=>r.id} renderRow={({row,index})=><tr>...</tr>} /></table>
 * Dış container (overflow-auto ve h-[...]) ile sarılmalı.
 */
export function VirtualTableBody<T>({
  rows,
  rowHeight = 48,
  estimateSize,
  renderRow,
  className,
  getRowKey,
}: VirtualTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize ?? rowHeight,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className={cn('overflow-auto', className)} style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index]
          return (
            <div
              key={getRowKey(row, virtualRow.index)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow({ row, index: virtualRow.index })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
