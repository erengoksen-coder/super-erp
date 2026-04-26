'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Factory, 
  PackageSearch, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { formatNumber } from '@/lib/utils'

/**
 * Super ERP - Production Analytics Dashboard
 * Premium visualization of manufacturing status, MRP needs, and delays.
 */

export default function ProductionDashboard() {
  const [shipment, setShipment] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])
  const [delays, setDelays] = useState<any[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [shipData, reqData, delayData] = await Promise.all([
          fetchApi('/api/production/shipment-ready'),
          fetchApi('/api/production/mrp-requirements'),
          fetchApi('/api/production/delays')
        ])
        setShipment(shipData || [])
        setRequirements(reqData || [])
        setDelays(delayData || [])
      } catch (error) {
        console.error('Dashboard data load failed:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  if (loading) return <div className="p-20 text-center opacity-20 animate-pulse font-black uppercase tracking-[0.5em]">Yükleniyor...</div>

  return (
    <div className="p-8 space-y-8 animate-reveal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sevkiyat Hazır */}
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } } }}>
          <Card className="h-full bg-gray-900/40 backdrop-blur-md border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 shadow-xl">
            <CardHeader
              title="Sevkiyata Hazır"
              subtitle="Üretimi bitmiş, sevkiyat bekleyen ürünler"
              icon={CheckCircle2}
            />
            <CardBody className="p-0 h-[350px] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                    <th className="px-4 py-3">Seç</th>
                    <th className="px-4 py-3">Müşteri / Ürün</th>
                    <th className="px-4 py-3 text-right">Miktar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {shipment.map((sh, idx) => {
                    const isSelected = selectedOrders.includes(sh.id)
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-emerald-500/5 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-500/10' : ''}`}
                        onClick={() => toggleOrderSelection(sh.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-400' : 'bg-gray-800 border-gray-700'}`}>
                            {isSelected && <Plus className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{sh.customer_name || 'Genel Stok'}</span>
                            <span className="text-[10px] text-gray-500">{sh.order_number} - {sh.product_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-emerald-400 font-mono">
                          {sh.quantity} ADT
                        </td>
                      </tr>
                    )
                  })}
                  {shipment.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-gray-600 text-xs">Sevkiyatta bekleyen ürün yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </motion.div>

        {/* Hammadde Gereksinim (MRP) Analizi */}
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.1 } } }}>
          <Card className="h-full bg-gray-900/40 backdrop-blur-md border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 shadow-xl">
            <CardHeader
              title="Kritik İhtiyaçlar"
              subtitle="Eksik hammadde ve malzemeler"
              icon={PackageSearch}
            />
            <CardBody className="p-0 overflow-x-auto h-[350px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                    <th className="px-4 py-3">Malzeme</th>
                    <th className="px-4 py-3 text-right">Eksik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {requirements.map((req, idx) => (
                    <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-300">
                        {req.material_name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded">
                          -{formatNumber(req.shortage)} {req.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {requirements.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-12 text-emerald-500/30 text-xs">Stoklar yeterli</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </motion.div>

        {/* Gecikme Analizi */}
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.2 } } }}>
          <Card className="h-full bg-gray-900/40 backdrop-blur-md border-rose-500/10 hover:border-rose-500/30 transition-all duration-300 shadow-xl">
            <CardHeader
              title="Gecikme Takibi"
              subtitle="Termin sapması gösteren emirler"
              icon={AlertCircle}
            />
            <CardBody className="p-0 h-[350px] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                    <th className="px-4 py-3">Emir</th>
                    <th className="px-4 py-3 text-right">Sapma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {delays.map((delay, idx) => (
                    <tr key={idx} className="hover:bg-rose-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-white">{delay.order_number}</span>
                          <span className="text-[9px] text-gray-600">{delay.due_date ? new Date(delay.due_date).toLocaleDateString() : 'Tarih Yok'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] font-bold text-rose-400">
                          {delay.delay_days || 0} Gün
                        </span>
                      </td>
                    </tr>
                  ))}
                  {delays.length === 0 && (
                    <tr>
                      <td colSpan={2} className="text-center py-12 text-emerald-500/30 text-xs">Geciken emir yok</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}