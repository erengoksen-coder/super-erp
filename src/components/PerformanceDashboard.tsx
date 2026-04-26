'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePerformanceMonitor } from '@/lib/performance'
import { Activity, Cpu, HardDrive, Database, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

interface SystemMetrics {
  system: {
    uptime: number
    memory: {
      heapUsed: number
      heapTotal: number
      rss: number
      external: number
    }
  }
  database: {
    tables: Record<string, number>
    dbSize: number
  }
}

interface PerformanceDashboardProps {
  className?: string
}

export function PerformanceDashboard({ className = '' }: PerformanceDashboardProps) {
  const performanceMetrics = usePerformanceMonitor({ sampleRate: 0.1 })
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/performance/metrics')
      if (!res.ok) throw new Error('Metrik alınamadı')
      const data = await res.json()
      setMetrics(data.data)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return d > 0 ? `${d}g ${h}s` : `${h}s ${m}d`
  }

  const getMemoryPercent = () => {
    if (!metrics) return 0
    const { heapUsed, heapTotal } = metrics.system.memory
    return Math.round((heapUsed / heapTotal) * 100)
  }

  const getHealthStatus = () => {
    if (getMemoryPercent() > 85) return 'error'
    if (getMemoryPercent() > 70) return 'warning'
    return 'healthy'
  }

  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-500/10', icon: CheckCircle },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: AlertTriangle },
    error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
  }

  const status = getHealthStatus()
  const StatusIcon = statusConfig[status].icon

  if (loading) {
    return (
      <div className={`p-4 bg-gray-900/50 rounded-lg ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 bg-gray-900/50 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-sm">Performans</h3>
        <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusConfig[status].bg}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusConfig[status].color}`} />
          <span className={`text-xs font-medium ${statusConfig[status].color}`}>
            {status === 'healthy' ? 'Sağlıklı' : status === 'warning' ? 'Dikkat' : 'Kritik'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Zap className="w-4 h-4" />}
          label="Heap Kullanımı"
          value={`${getMemoryPercent()}%`}
          sub={`${metrics?.system.memory.heapUsed || 0} / ${metrics?.system.memory.heapTotal || 0} MB`}
          color={getMemoryPercent() > 70 ? 'yellow' : 'blue'}
        />
        
        <MetricCard
          icon={<HardDrive className="w-4 h-4" />}
          label="RAM (RSS)"
          value={`${metrics?.system.memory.rss || 0} MB`}
          sub={`Harici: ${metrics?.system.memory.external || 0} MB`}
          color="blue"
        />

        <MetricCard
          icon={<Database className="w-4 h-4" />}
          label="DB Boyutu"
          value={`${metrics?.database.dbSize || 0} MB`}
          sub={`${Object.values(metrics?.database.tables || {}).reduce((a, b) => a + b, 0)} kayıt`}
          color="purple"
        />

        <MetricCard
          icon={<Cpu className="w-4 h-4" />}
          label="Çalışma Süresi"
          value={formatUptime(metrics?.system.uptime || 0)}
          sub="Sunucu aktif"
          color="green"
        />
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

function MetricCard({ icon, label, value, sub, color = 'blue' }: MetricCardProps) {
  const colors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="bg-gray-800/50 rounded p-2.5">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  )
}

export function LighthouseScore({ metrics }: { metrics: ReturnType<typeof usePerformanceMonitor> }) {
  const getScore = (value: number, good: number, poor: number) => {
    if (value <= good) return { score: 100, status: 'Mükemmel', color: 'text-green-500' }
    if (value <= poor) return { score: 75, status: 'İyi', color: 'text-yellow-500' }
    return { score: 50, status: 'Zayıf', color: 'text-red-500' }
  }

  const lcpScore = getScore(metrics.lcp, 2500, 4000)
  const fidScore = getScore(metrics.fid, 100, 300)
  const clsScore = getScore(metrics.cls * 1000, 100, 250)

  return (
    <div className="grid grid-cols-3 gap-2">
      <ScoreCard label="LCP" value={Math.round(metrics.lcp)} unit="ms" {...lcpScore} />
      <ScoreCard label="FID" value={Math.round(metrics.fid)} unit="ms" {...fidScore} />
      <ScoreCard label="CLS" value={metrics.cls.toFixed(2)} unit="" {...clsScore} />
    </div>
  )
}

function ScoreCard({ label, value, unit, score, status, color }: any) {
  return (
    <div className="bg-gray-800/50 rounded p-2 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}{unit}</p>
      <p className={`text-xs ${color}`}>{status}</p>
    </div>
  )
}
