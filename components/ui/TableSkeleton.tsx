'use client'

import React from 'react'
import { cn } from '@/lib/cn'

interface TableSkeletonProps {
  rows?: number
  cols?: number
  className?: string
}

export function TableSkeleton({ rows = 5, cols = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-gray-900 rounded-lg border border-gray-800 overflow-hidden', className)}>
      <div className="border-b border-gray-800 flex gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-700 rounded flex-1 max-w-[120px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-800/80 flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-800 rounded flex-1"
              style={{ maxWidth: colIndex === 0 ? 100 : 120, animationDelay: `${rowIndex * 50 + colIndex * 20}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
