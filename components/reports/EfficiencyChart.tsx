'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { BarChart3 } from 'lucide-react'

interface EfficiencyData {
  name: string
  planned: number
  actual: number
  efficiency: number
  count: number
}

interface Props {
  data: EfficiencyData[]
  loading?: boolean
}

export function EfficiencyChart({ data, loading }: Props) {
  if (loading) {
    return (
      <Card variant="elevated" className="h-[400px] animate-pulse">
        <CardBody className="flex items-center justify-center h-full">
          <p className="text-gray-500">Veriler yükleniyor...</p>
        </CardBody>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" className="h-[400px]">
        <CardBody className="flex items-center justify-center h-full">
          <p className="text-gray-500">Analiz edilecek veri bulunamadı.</p>
        </CardBody>
      </Card>
    )
  }

  // Verimliliğe göre renk belirle
  const getEfficiencyColor = (eff: number) => {
    if (eff >= 100) return '#22c55e' // Yeşil (İyi)
    if (eff >= 80) return '#f59e0b'  // Turuncu (Orta)
    return '#ef4444'                // Kırmızı (Düşük)
  }

  return (
    <Card variant="elevated">
      <CardHeader 
        title="İstasyon Verimlilik Analizi" 
        subtitle="Planlanan vs Gerçekleşen Süre (%)"
        actions={<BarChart3 className="h-5 w-5 text-blue-500" />}
      />
      <CardBody>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `%${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend verticalAlign="top" align="right" />
              <Bar dataKey="efficiency" name="Verimlilik %" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getEfficiencyColor(entry.efficiency)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.map((entry) => (
            <div key={entry.name} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">{entry.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">%{entry.efficiency}</span>
                <Badge variant="outline" color={entry.efficiency >= 100 ? 'success' : entry.efficiency >= 80 ? 'warning' : 'error'}>
                  {entry.count} İşlem
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
