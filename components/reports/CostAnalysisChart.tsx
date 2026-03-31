'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Wallet } from 'lucide-react'

interface CostData {
  id: string
  name: string
  sku: string
  materialCost: number
  laborCost: number
  totalCost: number
  sellingPrice: number
  margin: number
}

interface Props {
  data: CostData[]
  loading?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function CostAnalysisChart({ data, loading }: Props) {
  if (loading) {
    return <Card variant="elevated" className="h-[400px] animate-pulse" />
  }

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" className="h-[400px]">
        <CardBody className="flex items-center justify-center h-full">
          <p className="text-gray-500">Maliyet analizi için veri bulunamadı.</p>
        </CardBody>
      </Card>
    )
  }

  // Kar Marjı Dağılımı (Pie Chart için grupla)
  const marginGroups = [
    { name: '%0-10', value: data.filter(d => d.margin <= 10).length, fill: '#ef4444' },
    { name: '%11-20', value: data.filter(d => d.margin > 10 && d.margin <= 20).length, fill: '#f59e0b' },
    { name: '%21-40', value: data.filter(d => d.margin > 20 && d.margin <= 40).length, fill: '#3b82f6' },
    { name: '>%40+', value: data.filter(d => d.margin > 40).length, fill: '#22c55e' },
  ]

  // En karlı 5 ürünü al (Bar Chart için)
  const topProducts = data.sort((a, b) => b.margin - a.margin).slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card variant="elevated">
        <CardHeader 
          title="Kâr Marjı Dağılımı" 
          subtitle="Ürünlerin kârlılık segmentleri"
          actions={<Wallet className="h-5 w-5 text-green-500" />}
        />
        <CardBody className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={marginGroups}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {marginGroups.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardHeader 
          title="En Yüksek Kar Marjlı Ürünler (%)" 
          subtitle="İlk 5 ürün performansı"
        />
        <CardBody className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `%${v}`} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
              />
              <Bar dataKey="margin" name="Kar Marjı %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  )
}
