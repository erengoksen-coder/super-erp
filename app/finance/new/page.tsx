'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { getReferenceLink } from '@/lib/utils/journal-reference'

type ChartAccount = {
  id: string
  code: string
  name: string
}

type JournalLine = {
  account_code: string
  debit: string
  credit: string
  description: string
}

export default function NewFinancePage() {
  const { data: accountsData } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => accountsData ?? [], [accountsData])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: 'manual',
    reference_id: ''
  })
  const [lines, setLines] = useState<JournalLine[]>([
    { account_code: '', debit: '', credit: '', description: '' },
    { account_code: '', debit: '', credit: '', description: '' }
  ])

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    return { debit, credit }
  }, [lines])

  const referenceLink = useMemo(
    () => (form.reference_id?.trim() ? getReferenceLink(form.reference_type, form.reference_id) : null),
    [form.reference_type, form.reference_id]
  )

  function updateLine(index: number, patch: Partial<JournalLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  function addLine() {
    setLines((current) => [...current, { account_code: '', debit: '', credit: '', description: '' }])
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) {
      toast.warning('Açıklama zorunludur')
      return
    }
    if (lines.length < 2) {
      toast.warning('En az 2 satır olmalıdır')
      return
    }
    const normalizedLines = lines.map((line) => ({
      account_code: line.account_code,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      description: line.description || form.description
    }))
    if (normalizedLines.some((line) => !line.account_code)) {
      toast.warning('Tüm satırlarda hesap seçilmelidir')
      return
    }
    if (Math.abs(totals.debit - totals.credit) > 0.01) {
      toast.warning('Borç ve alacak toplamları eşit olmalıdır')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: form.entry_date,
          description: form.description,
          reference_type: form.reference_type,
          reference_id: form.reference_id || undefined,
          lines: normalizedLines
        })
      })
      toast.success('Yevmiye kaydı oluşturuldu')
      setForm({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_type: 'manual',
        reference_id: ''
      })
      setLines([
        { account_code: '', debit: '', credit: '', description: '' },
        { account_code: '', debit: '', credit: '', description: '' }
      ])
    } catch (error: any) {
      toast.error(error.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Muhasebe Fişi</h1>
        <p className="text-gray-400 mt-1">Yeni yevmiye kaydı oluşturun</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tarih</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">İşlem Tipi</label>
            <select
              value={form.reference_type}
              onChange={(e) => setForm({ ...form, reference_type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="manual">Manuel</option>
              <option value="sale">Satış</option>
              <option value="purchase">Satın Alma</option>
              <option value="production">Üretim</option>
              <option value="stock_in">Stok Girişi</option>
              <option value="stock_out">Stok Çıkışı</option>
              <option value="payment">Ödeme</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Referans ID</label>
            <input
              value={form.reference_id}
              onChange={(e) => setForm({ ...form, reference_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Opsiyonel"
            />
            {referenceLink && (
              <p className="mt-1 text-sm text-gray-400">
                İlgili kayıt:{' '}
                <Link
                  href={referenceLink.href}
                  className="text-blue-400 hover:text-blue-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {referenceLink.label} →
                </Link>
              </p>
            )}
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-2">Açıklama</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Yevmiye açıklaması"
              required
            />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800">
            <h2 className="text-white font-semibold">Fiş Satırları</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-1"
            >
              <Plus size={16} />
              <span>Satır Ekle</span>
            </button>
          </div>
          <div className="p-4 space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4">
                  <select
                    value={line.account_code}
                    onChange={(e) => updateLine(index, { account_code: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                  >
                    <option value="">Hesap seçin</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.debit}
                    onChange={(e) => updateLine(index, { debit: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                    placeholder="Borç"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.credit}
                    onChange={(e) => updateLine(index, { credit: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                    placeholder="Alacak"
                  />
                </div>
                <div className="md:col-span-3">
                  <input
                    value={line.description}
                    onChange={(e) => updateLine(index, { description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                    placeholder="Açıklama"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-400 hover:text-red-300"
                      title="Satırı sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-red-400">Toplam Borç: {totals.debit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
              <span className="text-green-400">Toplam Alacak: {totals.credit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
              {Math.abs(totals.debit - totals.credit) <= 0.01 ? (
                <span className="text-green-400 font-medium">✓ Borç = Alacak</span>
              ) : (
                <span className="text-amber-400 font-medium">Borç ve alacak eşit olmalıdır</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || Math.abs(totals.debit - totals.credit) > 0.01}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Kaydediliyor...' : 'Fişi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}


