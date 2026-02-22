'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { generateInvoiceNumber } from '@/lib/utils/codeGenerator'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Plus, Trash2 } from 'lucide-react'

type Account = { id: string; code: string; name: string; type: string }

type Material = { id: string; code: string; name: string; unit?: string; category?: string | null }

type LineItem = { description: string; quantity: string; unit_price: string; material_id: string }

export default function NewInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>('purchase')
  const [suppliers, setSuppliers] = useState<Account[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    document_kind: 'invoice' as 'invoice' | 'slip',
    invoice_date: new Date().toISOString().split('T')[0],
    tax_rate: '18',
    notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: '', unit_price: '', material_id: '' },
  ])
  const [addingMaterialForRow, setAddingMaterialForRow] = useState<number | null>(null)
  const [newMaterialForm, setNewMaterialForm] = useState({ name: '', unit: 'adet' })
  const [creatingMaterial, setCreatingMaterial] = useState(false)

  useEffect(() => {
    async function loadCode() {
      try {
        const newCode = await generateInvoiceNumber(invoiceType)
        setInvoiceNumber(newCode)
      } catch {
        const year = new Date().getFullYear()
        setInvoiceNumber(invoiceType === 'sale' ? `SAT-${year}-001` : `ALI-${year}-001`)
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
  }, [invoiceType])

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await fetchApi<Account[]>('/api/accounts?type=supplier')
      setSuppliers(Array.isArray(data) ? data : [])
    } catch {
      setSuppliers([])
    }
  }, [])

  const loadMaterials = useCallback(async () => {
    try {
      const data = await fetchApi<Material[]>(`/api/materials?_=${Date.now()}`)
      setMaterials(Array.isArray(data) ? data : [])
    } catch {
      setMaterials([])
    }
  }, [])

  useEffect(() => {
    if (invoiceType === 'purchase') {
      loadSuppliers()
      loadMaterials()
    }
  }, [invoiceType, loadSuppliers, loadMaterials])

  function addLine() {
    setItems((prev) => [...prev, { description: '', quantity: '', unit_price: '', material_id: '' }])
  }

  function removeLine(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  /** Depodaki sıra: sayısal kodlu (0007 gibi) hammaddeler önce; sayısal olanlar kendi arasında sayıya göre (0007 < 088). */
  function sortMaterialsLikeDepo(list: Material[]) {
    const codeStr = (m: Material) => String(m.code ?? '').trim()
    const isNumericCode = (c: string) => /^\d+$/.test(c)
    const numValue = (c: string) => (isNumericCode(c) ? parseInt(c, 10) : Infinity)
    return [...list].sort((a, b) => {
      const ac = codeStr(a)
      const bc = codeStr(b)
      const aNum = isNumericCode(ac)
      const bNum = isNumericCode(bc)
      if (aNum && !bNum) return -1
      if (!aNum && bNum) return 1
      if (aNum && bNum) return numValue(ac) - numValue(bc)
      return ac.localeCompare(bc)
    })
  }

  /** Hammadde Depo sayfasındaki gibi kategori + sıra numarası (0001, 0002, …). Fişte aynı kodun görünmesi için. */
  const depoDisplayCodeByMaterialId = useMemo(() => {
    const map = new Map<string, string>()
    const category = (m: Material) => {
      const c = (m.category ?? '').trim()
      if (c) return c
      const n = (m.name ?? '').toLowerCase()
      if (n.includes('kumaş')) return 'Kumaş'
      if (n.includes('sünger')) return 'Sünger'
      if (n.includes('ayak')) return 'Ayak'
      return 'Diğer'
    }
    const normalizeName = (name: string) => (name || '').replace(/^Kumaş\s+/i, '').trim()
    const byCategory = materials.reduce((acc, m) => {
      const cat = category(m)
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(m)
      return acc
    }, {} as Record<string, Material[]>)
    const categoryOrder = Object.keys(byCategory).sort((a, b) => a.localeCompare(b, 'tr'))
    for (const cat of categoryOrder) {
      const list = [...(byCategory[cat] ?? [])].sort((a, b) =>
        normalizeName(a.name).localeCompare(normalizeName(b.name), 'tr', { numeric: true })
      )
      list.forEach((m, i) => map.set(m.id, String(i + 1).padStart(4, '0')))
    }
    return map
  }, [materials])

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => {
      let next = prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
      if (field === 'description' && value.trim()) {
        const desc = value.trim().toLowerCase()
        const descNoSpaces = desc.replace(/\s+/g, '')
        const firstWord = desc.split(/\s+/)[0] || desc
        const match = materials.filter(
          (m) => {
            const name = (m.name || '').trim().toLowerCase()
            const code = String(m.code ?? '').trim().toLowerCase()
            const nameNs = name.replace(/\s+/g, '')
            const codeNumeric = /^\d+$/.test(String(m.code ?? '').trim())
            return (
              name === desc || name.includes(desc) || nameNs.includes(descNoSpaces) || descNoSpaces.includes(nameNs) ||
              code === desc || code.includes(desc) ||
              (codeNumeric && name.includes(firstWord))
            )
          }
        )
        if (match.length >= 1) {
          const fourDigitOnly = match.filter((m) => /^\d{4}$/.test(String(m.code ?? '').trim()))
          const numericOnly = match.filter((m) => /^\d+$/.test(String(m.code ?? '').trim()))
          const listToPick = fourDigitOnly.length >= 1 ? fourDigitOnly : numericOnly.length >= 1 ? numericOnly : match
          const preferred = sortMaterialsLikeDepo(listToPick)[0]
          next = next.map((row, i) => (i === index ? { ...row, material_id: preferred.id } : row))
        }
      }
      return next
    })
  }

  function openAddMaterial(rowIndex: number) {
    const desc = items[rowIndex]?.description?.trim() || ''
    setNewMaterialForm({ name: desc || '', unit: 'adet' })
    setAddingMaterialForRow(rowIndex)
  }

  async function createMaterialAndSelect() {
    if (addingMaterialForRow == null) return
    const name = newMaterialForm.name.trim()
    if (!name || name.length < 2) {
      toast.error('Hammadde adı en az 2 karakter olmalı')
      return
    }
    setCreatingMaterial(true)
    try {
      const created = await fetchApi<{ id: string; code: string; name: string }>('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          unit: newMaterialForm.unit.trim() || 'adet',
          category: 'Genel',
        }),
      })
      setMaterials((prev) => [...prev, { id: created.id, code: created.code || '', name: created.name, unit: newMaterialForm.unit }])
      setItems((prev) =>
        prev.map((row, i) => (i === addingMaterialForRow ? { ...row, material_id: created.id } : row))
      )
      setAddingMaterialForRow(null)
      setNewMaterialForm({ name: '', unit: 'adet' })
      toast.success('Hammadde eklendi ve seçildi')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hammadde eklenemedi')
    } finally {
      setCreatingMaterial(false)
    }
  }

  async function handleSubmitPurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customer_id) {
      toast.error('Tedarikçi seçin')
      return
    }
    const validItems = items
      .map((row) => ({
        description: row.description.trim(),
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        material_id: row.material_id?.trim() || undefined,
      }))
      .filter((row) => row.description && row.quantity > 0 && row.unit_price >= 0)
    if (validItems.length === 0) {
      toast.error('En az bir kalem girin: açıklama, miktar > 0, birim fiyat >= 0')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'purchase',
          customer_id: form.customer_id,
          document_kind: form.document_kind,
          invoice_date: form.invoice_date,
          tax_rate: Number(form.tax_rate) || 0,
          notes: form.notes.trim() || undefined,
          items: validItems,
        }),
      })
      toast.success(form.document_kind === 'slip' ? 'Alış fişi kaydedildi' : 'Alış faturası kaydedildi')
      setForm({ customer_id: '', document_kind: form.document_kind, invoice_date: new Date().toISOString().split('T')[0], tax_rate: '18', notes: '' })
      setItems([{ description: '', quantity: '', unit_price: '', material_id: '' }])
      const newCode = await generateInvoiceNumber('purchase').catch(() => `ALI-${new Date().getFullYear()}-001`)
      setInvoiceNumber(newCode)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Panel', href: '/dashboard' }, { label: 'Faturalar', href: '/invoices' }, { label: 'Yeni Alış Faturası / Fiş' }]} className="mb-4" />
      <div className="mb-6">
        <Link href="/invoices" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Alış Faturası / Fiş</h1>
        <p className="text-gray-400 mt-1">Tedarikçiden gelen fatura veya fişi buradan girin.</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">İşlem türü</label>
        <select
          value={invoiceType}
          onChange={(e) => setInvoiceType(e.target.value as 'sale' | 'purchase')}
          className="w-full max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
        >
          <option value="sale">Satış Faturası (sevkiyattan)</option>
          <option value="purchase">Alış Faturası Fişi (tedarikçi)</option>
        </select>
      </div>

      {invoiceType === 'sale' ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="rounded-lg border border-yellow-700 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
            Satış faturaları sevkiyatlardan oluşturulur. <Link href="/shipments" className="underline">Sevkiyat</Link> sayfasından fatura kesin.
          </div>
          <p className="text-gray-400 mt-2 text-sm">Fatura no önizleme: {codeLoading ? '...' : invoiceNumber}</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <p className="text-gray-400 mb-4 text-sm">Tedarikçiden gelen fatura veya fişi buradan girebilirsiniz. Kalemde <strong>Hammadde</strong> seçerseniz miktar doğrudan hammadde depoya stok girişi olarak yazılır. Kayıt sonrası Ödemeler sayfasından tedarikçiye ödeme bağlayabilirsiniz.</p>
          <form onSubmit={handleSubmitPurchase} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Belge türü *</label>
                <select
                  value={form.document_kind}
                  onChange={(e) => setForm((f) => ({ ...f, document_kind: e.target.value as 'invoice' | 'slip' }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  <option value="invoice">Fatura</option>
                  <option value="slip">Fiş</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tedarikçi (Cari) *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                  required
                >
                  <option value="">Seçin</option>
                  {suppliers.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tarih *</label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">KDV % (opsiyonel)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Not</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Fatura no, irsaliye no vb."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">Kalemler *</label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Satır Ekle
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-left">
                      <th className="p-2">Açıklama</th>
                      <th className="p-2 min-w-[140px]">Hammadde (depoya gider)</th>
                      <th className="p-2 w-24">Miktar</th>
                      <th className="p-2 w-28">Birim Fiyat (₺)</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateLine(i, 'description', e.target.value)}
                            placeholder="Mal/hizmet adı"
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.material_id}
                            onChange={(e) => {
                              const v = e.target.value
                              if (v === '__new__') {
                                openAddMaterial(i)
                              } else {
                                const depoCode = depoDisplayCodeByMaterialId.get(v) ?? materials.find((m) => m.id === v)?.code ?? ''
                                const newDesc = depoCode ? `kumaş ${depoCode}` : ''
                                setItems((prev) =>
                                  prev.map((row, idx) =>
                                    idx === i ? { ...row, material_id: v, description: newDesc || row.description } : row
                                  )
                                )
                              }
                            }}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded min-w-[120px]"
                          >
                            <option value="">— Seçmezsen stok yapılmaz</option>
                            {(() => {
                              const filtered = row.description.trim()
                                ? materials.filter((m) => {
                                    const desc = row.description.trim().toLowerCase()
                                    const descNs = desc.replace(/\s+/g, '')
                                    const firstWord = desc.split(/\s+/)[0] || desc
                                    const name = (m.name || '').trim().toLowerCase()
                                    const code = String(m.code ?? '').trim().toLowerCase()
                                    const nameNs = name.replace(/\s+/g, '')
                                    const codeNumeric = /^\d+$/.test(String(m.code ?? '').trim())
                                    return name.includes(desc) || nameNs.includes(descNs) || descNs.includes(nameNs) || code.includes(desc) || (codeNumeric && name.includes(firstWord))
                                  })
                                : materials
                              const selected = row.material_id ? materials.find((m) => m.id === row.material_id) : null
                              const list = selected && !filtered.some((m) => m.id === selected.id) ? [selected, ...filtered] : filtered
                              return sortMaterialsLikeDepo(list).map((m) => {
                                const depoCode = depoDisplayCodeByMaterialId.get(m.id) ?? m.code ?? ''
                                const displayName = ((m.name ?? '').replace(/^Kumaş\s+/i, '').trim()) || (m.name ?? '')
                                const codeLabel = depoCode ? `Kumaş ${depoCode}` : ''
                                return (
                                  <option key={m.id} value={m.id}>{codeLabel}{codeLabel ? ' - ' : ''}{displayName}</option>
                                )
                              })
                            })()}
                            <option value="__new__">+ Yeni hammadde ekle</option>
                          </select>
                          {addingMaterialForRow === i && (
                            <div className="mt-2 p-2 rounded bg-gray-800 border border-gray-600 flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={newMaterialForm.name}
                                onChange={(e) => setNewMaterialForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Hammadde adı *"
                                className="px-2 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm min-w-[120px]"
                              />
                              <input
                                type="text"
                                value={newMaterialForm.unit}
                                onChange={(e) => setNewMaterialForm((f) => ({ ...f, unit: e.target.value }))}
                                placeholder="Birim"
                                className="px-2 py-1.5 bg-gray-700 border border-gray-600 text-white rounded text-sm w-20"
                              />
                              <Button type="button" size="sm" onClick={createMaterialAndSelect} disabled={creatingMaterial}>
                                {creatingMaterial ? 'Ekleniyor…' : 'Ekle ve seç'}
                              </Button>
                              <button
                                type="button"
                                onClick={() => setAddingMaterialForRow(null)}
                                className="text-gray-400 hover:text-white text-sm"
                              >
                                İptal
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.quantity}
                            onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.unit_price}
                            onChange={(e) => updateLine(i, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 text-white rounded"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="p-1.5 text-red-400 hover:bg-gray-800 rounded"
                            title="Satırı sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-1">Belge no otomatik atanır (ALI-YIL-SIRA). Hammadde seçilen kalemlerin miktarı doğrudan hammadde depoya (Ana Depo) stok girişi olarak yazılır.</p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Link href="/invoices">
                <Button type="button" variant="outline">İptal</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Kaydediliyor…' : form.document_kind === 'slip' ? 'Alış Fişini Kaydet' : 'Alış Faturasını Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
