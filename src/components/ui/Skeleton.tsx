import React from 'react'
import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
  variant?: 'rectangular' | 'circular' | 'text'
}

/**
 * Platinum-themed Skeleton Component
 * Optimized for glassmorphic layouts with shimmer effect
 */
export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5 border border-white/5',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-xl',
        variant === 'text' && 'rounded h-4 w-full h-[1em]',
        className
      )}
    />
  )
}

/**
 * High-end table rows skeleton
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/5 transition-colors">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="p-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Premium Card skeleton with glassmorphic styling
 */
export function CardSkeleton() {
  return (
    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-4 shadow-glow shadow-white/5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  )
}

/**
 * High-end Header skeleton for page transitions
 */
export function DashboardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-white/5">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  )
}
