'use client'

import { Suspense, lazy, ComponentType, ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

interface LazyLoadOptions {
  fallback?: ReactNode
  ssr?: boolean
}

export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const { fallback = <Skeleton className="h-32 w-full animate-pulse" />, ssr = false } = options
  
  return lazy(() => importFn())
}

interface DynamicLoaderProps {
  children: ReactNode
  loading?: boolean
  height?: string
}

export function DynamicLoader({ children, loading, height = 'h-64' }: DynamicLoaderProps) {
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${height}`}>
        <Skeleton className={`h-full w-full ${height} animate-pulse`} />
      </div>
    )
  }
  
  return <>{children}</>
}

interface SuspenseWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  name?: string
}

export function SuspenseWrapper({ 
  children, 
  fallback = <Skeleton className="h-64 w-full animate-pulse" />,
  name 
}: SuspenseWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  )
}
