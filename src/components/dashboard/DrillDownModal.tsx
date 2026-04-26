'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/Button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/Badge'

interface DrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'revenue' | 'aging' | null
  month?: string | null
  bucket?: string | null
}

export function DrillDownModal({ isOpen, onClose, type, month, bucket }: DrillDownModalProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fmtCur = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)

  const title = type === 'revenue' 
    ? `${month} Ciro Detayları` 
    : type === 'aging' 
    ? `Alacak Yaşlandırma Detayı: ${bucket}` 
    : 'Detaylı Veri'

  useEffect(() => {
    if (isOpen && type) {
      const loadData = async () => {
        setLoading(true)
        try {
          const params = new URLSearchParams()
          params.append('type', type)
          if (month) params.append('month', month)
          if (bucket) params.append('bucket', bucket)

          const res = await fetchApi<any>(`/api/dashboard/stats/drilldown?${params.toString()}`)
          setData(res?.list || [])
        } catch (err) {
          console.error('Drilldown fetch error:', err)
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [isOpen, type, month, bucket])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title={title}>
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Bu döneme ait detaylı veri bulunamadı.</div>
        ) : (
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {type === 'revenue' ? (
                    <>
                      <TableHead>Sevkiyat No</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead className="text-right">Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Müşteri / Cari Adı</TableHead>
                      <TableHead className="text-right">Vadesi Geçen Tutar</TableHead>
                      <TableHead className="text-center">İşlem Sayısı</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, i) => (
                  <TableRow key={i}>
                    {type === 'revenue' ? (
                      <>
                        <TableCell className="font-medium text-blue-400">{item.shipment_number}</TableCell>
                        <TableCell className="text-gray-300">{item.customer_name}</TableCell>
                        <TableCell className="text-gray-400">{item.shipment_date}</TableCell>
                        <TableCell className="text-right font-bold text-white">{fmtCur(item.amount)}</TableCell>
                        <TableCell>
                          <Badge 
                            color={item.status === 'completed' ? 'success' : 'warning'}
                            variant="soft"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium text-white">{item.account_name}</TableCell>
                        <TableCell className="text-right font-bold text-red-400">{fmtCur(item.overdue_amount)}</TableCell>
                        <TableCell className="text-center text-gray-400">{item.transaction_count}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </Modal>
  )
}
