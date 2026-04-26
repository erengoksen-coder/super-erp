'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Truck } from 'lucide-react'
import { formatDate } from '@/lib/utils/dateFormat'

type InvoiceRow = { id: string; invoice_number: string; customer_name?: string; invoice_date: string; final_amount?: number }
type ShipmentRow = { id: string; shipment_number: string; customer_name?: string; shipment_date: string; status?: string }

export function RecentActivity() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [shipments, setShipments] = useState<ShipmentRow[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/invoices?limit=5&offset=0', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/shipments?limit=5', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([invRes, shipRes]) => {
      if (cancelled) return
      const invData = invRes?.data ?? invRes
      const shipData = shipRes?.data ?? shipRes
      setInvoices(Array.isArray(invData) ? invData.slice(0, 5) : [])
      setShipments(Array.isArray(shipData) ? shipData.slice(0, 5) : [])
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (invoices.length === 0 && shipments.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {invoices.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Son Faturalar
            </h3>
            <Link href="/invoices" className="text-xs text-blue-400 hover:text-blue-300">
              Tümü →
            </Link>
          </div>
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex justify-between text-sm text-gray-400 hover:text-white transition"
                >
                  <span>{inv.invoice_number} · {inv.customer_name || '—'}</span>
                  <span>{formatDate(inv.invoice_date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {shipments.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Son Sevkiyatlar
            </h3>
            <Link href="/shipments" className="text-xs text-blue-400 hover:text-blue-300">
              Tümü →
            </Link>
          </div>
          <ul className="space-y-2">
            {shipments.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/shipments/${s.id}`}
                  className="flex justify-between text-sm text-gray-400 hover:text-white transition"
                >
                  <span>{s.shipment_number} · {s.customer_name || '—'}</span>
                  <span>{formatDate(s.shipment_date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
