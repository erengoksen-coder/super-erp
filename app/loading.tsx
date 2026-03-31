'use client'

import { DashboardHeaderSkeleton, CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in p-8">
      {/* Header Skeleton */}
      <DashboardHeaderSkeleton />

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main Content Skeleton (Table Placeholder) */}
      <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
           <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
           <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableSkeleton rows={8} cols={5} />
          </table>
        </div>
      </div>
    </div>
  )
}
