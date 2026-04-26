'use client'

import { useEffect, useState } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts'
import { Wallet, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type FinancialStats = {
  totalRevenue: number
  totalExpense: number
  netProfit: number
  pendingReceivables: number
  monthlyTrends: Array<{
    month: string
    revenue: number
    expense: number
  }>
}

export function FinancialDashboard() {
  const [data, setData] = useState<FinancialStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const stats = await fetchApi<FinancialStats>('/api/dashboard/financial')
        if (!cancelled) {
          setData(stats)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Finansal veriler yüklenemedi')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Yükleniyor...</div>
  }

  if (error) {
    return <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-lg">{error}</div>
  }

  if (!data) return null

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val)

  return (
    <div className="space-y-6">
      {/* Üst Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Toplam Gelir</p>
                <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.totalRevenue)}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Toplam Gider</p>
                <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.totalExpense)}</h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Kar</p>
                <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.netProfit)}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Bekleyen Tahsilat</p>
                <h3 className="text-2xl font-bold text-white mt-1">{formatCurrency(data.pendingReceivables)}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Grafik */}
      <Card variant="elevated">
        <CardHeader 
          title="Finansal Trend" 
          subtitle="Son 6 aylık gelir ve gider karşılaştırması"
        />
        <CardBody className="h-[350px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrends}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `₺${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} align="right" iconType="circle" />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Gelir"
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorRev)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                name="Gider"
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#colorExp)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  )
}
