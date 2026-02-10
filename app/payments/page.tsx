'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

type Account = {
  id: string
  code: string
  name: string
  type: string
}

type Invoice = {
  id: string
  invoice_number: string
  customer_id: string
  final_amount: number
  status: string
  type: string
}

type Payment = {
  id: string
  account_id: string
  invoice_id: string | null
  amount: number
  payment_date: string
  method: string | null
  type: 'receipt' | 'payment'
  notes?: string | null
  account_name?: string | null
  account_code?: string | null
  invoice_number?: string | null
  invoice_final_amount?: number | null
}

export default function PaymentsPage() {
  const { data: paymentsData, isLoading, mutate } = useApi<Payment[]>('/api/payments')
  const { data: accountsData } = useApi<Account[]>('/api/accounts')
  const { data: invoicesData } = useApi<Invoice[]>('/api/invoices')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    account_id: '',
    invoice_id: '',
    amount: '',
    payment_date: '',
    method: '',
    type: 'receipt',
    notes: ''
  })

  useEffect(() => {
    if (form.payment_date) return
    const today = new Date().toISOString().split('T')[0]
    setForm((prev) => ({ ...prev, payment_date: today }))
  }, [form.payment_date])

  const accounts = useMemo(() => accountsData ?? [], [accountsData])
  const invoices = useMemo(() => invoicesData ?? [], [invoicesData])
  const payments = useMemo(() => paymentsData ?? [], [paymentsData])

  const filteredInvoices = useMemo(() => {
    if (!form.account_id) return invoices
    const selectedAccount = accounts.find((account) => account.id === form.account_id)
    const expectedInvoiceType = selectedAccount?.type === 'supplier' ? 'purchase' : 'sale'
    return invoices.filter((invoice) => (
      invoice.customer_id === form.account_id &&
      (!invoice.type || invoice.type === expectedInvoiceType)
    ))
  }, [form.account_id, invoices, accounts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id || !form.amount) {
      toast.warning('Cari hesap ve tutar zorunludur')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: form.account_id,
          invoice_id: form.invoice_id || null,
          amount: Number(form.amount),
          payment_date: form.payment_date || null,
          method: form.method || null,
          type: form.type,
          notes: form.notes || null
        })
      })
      setForm({
        account_id: '',
        invoice_id: '',
        amount: '',
        payment_date: '',
        method: '',
        type: 'receipt',
        notes: ''
      })
      await mutate()
      toast.success('Ödeme kaydedildi')
    } catch (error: unknown) {
      toast.error('Hata: ' + (error instanceof Error ? error.message : 'İşlem başarısız'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Ödemeler</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400 mt-1">Tahsilat ve ödeme kayıtlarını yönetin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cari Hesap <span className="text-red-400">*</span>
            </label>
            <select
              value={form.account_id}
              onChange={(e) => setForm({ ...form, account_id: e.target.value, invoice_id: '' })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Cari hesap seçin</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name} ({account.type === 'supplier' ? 'Tedarikçi' : 'Müşteri'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              İşlem Tipi <span className="text-red-400">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="receipt">Tahsilat</option>
              <option value="payment">Ödeme</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fatura (opsiyonel)
            </label>
            <select
              value={form.invoice_id}
              onChange={(e) => setForm({ ...form, invoice_id: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Fatura seçin</option>
              {filteredInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - ₺{Number(invoice.final_amount || 0).toFixed(2)} ({invoice.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tutar <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tarih
            </label>
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Yöntem
            </label>
            <input
              type="text"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nakit, Havale, Kredi Kartı..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Not
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>{saving ? 'Kaydediliyor...' : 'Ödeme Kaydet'}</span>
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Ödeme Kayıtları</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Cari Hesap</TableHead>
              <TableHead>Fatura</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Yöntem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400">
                  Henüz ödeme kaydı yok.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-gray-200">
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-gray-200">
                    {payment.account_code ? `${payment.account_code} - ${payment.account_name}` : payment.account_name || '-'}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {payment.invoice_number || '-'}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {payment.type === 'receipt' ? 'Tahsilat' : 'Ödeme'}
                  </TableCell>
                  <TableCell className="text-gray-200 font-semibold">
                    ₺{Number(payment.amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {payment.method || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
