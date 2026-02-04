'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/modal'

type Account = {
  id: string
  code?: string | null
  name: string
  type?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_number?: string | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  balance?: number | null
  created_at?: string | null
  updated_at?: string | null
  created_by_name?: string | null
  updated_by_name?: string | null
}

export default function CrmClient() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    risk_limit: '',
    discount_rate: '',
    authorized_person_name: '',
    authorized_person_phone: '',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    risk_limit: '',
    discount_rate: '',
    authorized_person_name: '',
    authorized_person_phone: '',
  })
  const detailRef = useRef<HTMLDivElement | null>(null)

  async function loadAccounts() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<Account[]>('/api/accounts?type=customer')
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Müşteriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (!selectedAccount) return
    setEditForm({
      name: selectedAccount.name || '',
      email: selectedAccount.email || '',
      phone: selectedAccount.phone || '',
      address: selectedAccount.address || '',
      tax_number: selectedAccount.tax_number || '',
      risk_limit: selectedAccount.risk_limit?.toString() || '',
      discount_rate: selectedAccount.discount_rate?.toString() || '',
      authorized_person_name: selectedAccount.authorized_person_name || '',
      authorized_person_phone: selectedAccount.authorized_person_phone || '',
    })
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [selectedAccount])

  async function createCustomer() {
    setError(null)
    await fetchApi('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        type: 'customer',
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        tax_number: form.tax_number || null,
        risk_limit: form.risk_limit ? parseFloat(form.risk_limit) : null,
        discount_rate: form.discount_rate ? parseFloat(form.discount_rate) : null,
        authorized_person_name: form.authorized_person_name || null,
        authorized_person_phone: form.authorized_person_phone || null,
      }),
    })
    setForm({ name: '', email: '', phone: '', address: '', tax_number: '', risk_limit: '', discount_rate: '', authorized_person_name: '', authorized_person_phone: '' })
    setShowAddModal(false)
    await loadAccounts()
  }

  async function updateCustomer() {
    if (!selectedAccount) return
    setError(null)
    await fetchApi(`/api/accounts/${selectedAccount.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        tax_number: editForm.tax_number || null,
        risk_limit: editForm.risk_limit ? parseFloat(editForm.risk_limit) : null,
        discount_rate: editForm.discount_rate ? parseFloat(editForm.discount_rate) : null,
        authorized_person_name: editForm.authorized_person_name || null,
        authorized_person_phone: editForm.authorized_person_phone || null,
      }),
    })
    await loadAccounts()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Müşteri silinsin mi?')) return
    await fetchApi(`/api/accounts/${id}`, { method: 'DELETE' })
    if (selectedAccount?.id === id) {
      setSelectedAccount(null)
    }
    await loadAccounts()
  }

  const filteredAccounts = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return accounts.filter((account) => {
      if (!search) return true
      return (
        account.name.toLowerCase().includes(search) ||
        account.code?.toLowerCase().includes(search) ||
        account.email?.toLowerCase().includes(search) ||
        account.phone?.toLowerCase().includes(search) ||
        account.tax_number?.toLowerCase().includes(search)
      )
    })
  }, [accounts, searchTerm])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Müşteri Listesi" subtitle="CRM müşteri kartları" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Ara (isim, kod, e-posta, telefon, vergi no)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" onClick={loadAccounts} disabled={loading}>
              Yenile
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              Müşteri Ekle
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Kod</th>
                  <th className="py-2">Müşteri</th>
                  <th className="py-2">E-posta</th>
                  <th className="py-2">Telefon</th>
                  <th className="py-2">Vergi No</th>
                  <th className="py-2">Bakiye</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="border-t border-gray-800 text-gray-200 cursor-pointer hover:bg-gray-800/60"
                    onClick={() => setSelectedAccount(account)}
                  >
                    <td className="py-2">{account.code || '-'}</td>
                    <td className="py-2">{account.name}</td>
                    <td className="py-2">{account.email || '-'}</td>
                    <td className="py-2">{account.phone || '-'}</td>
                    <td className="py-2">{account.tax_number || '-'}</td>
                    <td className={`py-2 font-semibold ${account.balance && account.balance !== 0 ? (account.balance > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-200'}`}>
                      {account.balance ? `${account.balance.toLocaleString('tr-TR')} TL` : '0 TL'}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAccount(account)
                        }}
                      >
                        Detay
                      </Button>
                      <Button
                        variant="ghost"
                        color="error"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCustomer(account.id)
                        }}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredAccounts.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      Müşteri bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {selectedAccount && (
        <Card className="bg-gray-900 border border-gray-800" ref={detailRef}>
          <CardHeader title="Müşteri Detayı" subtitle={selectedAccount.name} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Kod</div>
                <div className="text-sm text-gray-200 font-semibold">{selectedAccount.code || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">E-posta</div>
                <div className="text-sm text-gray-200">{selectedAccount.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Telefon</div>
                <div className="text-sm text-gray-200">{selectedAccount.phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Vergi No</div>
                <div className="text-sm text-gray-200">{selectedAccount.tax_number || '-'}</div>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Adres</div>
                <div className="text-sm text-gray-200">{selectedAccount.address || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Risk Limiti</div>
                <div className="text-sm text-gray-200">
                  {selectedAccount.risk_limit ? `${selectedAccount.risk_limit.toLocaleString('tr-TR')} TL` : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">İskonto Oranı</div>
                <div className="text-sm text-gray-200 font-semibold">
                  {selectedAccount.discount_rate ? `%${selectedAccount.discount_rate.toFixed(2)}` : '%0'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Bakiye</div>
                <div className={`text-sm font-semibold ${selectedAccount.balance && selectedAccount.balance !== 0 ? (selectedAccount.balance > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-200'}`}>
                  {selectedAccount.balance ? `${selectedAccount.balance.toLocaleString('tr-TR')} TL` : '0 TL'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Oluşturulma</div>
                <div className="text-sm text-gray-200">
                  {selectedAccount.created_at ? new Date(selectedAccount.created_at).toLocaleDateString('tr-TR') : '-'}
                </div>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-gray-400 mb-1">Yetkili Kişi</div>
                <div className="text-sm text-gray-200 font-semibold">{selectedAccount.authorized_person_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Yetkili Kişi Telefonu</div>
                <div className="text-sm text-gray-200">{selectedAccount.authorized_person_phone || '-'}</div>
              </div>
            </div>
            
            {(selectedAccount.created_by_name || selectedAccount.updated_by_name) && (
              <div className="grid gap-3 md:grid-cols-2">
                {selectedAccount.created_by_name && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Oluşturan</div>
                    <div className="text-sm text-gray-200">{selectedAccount.created_by_name}</div>
                  </div>
                )}
                {selectedAccount.updated_by_name && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Son Güncelleyen</div>
                    <div className="text-sm text-gray-200">{selectedAccount.updated_by_name}</div>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-4">
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Müşteri adı *"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="E-posta"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Telefon"
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Vergi No"
                value={editForm.tax_number}
                onChange={(e) => setEditForm((prev) => ({ ...prev, tax_number: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Adres"
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Risk Limiti (TL)"
                type="number"
                step="0.01"
                value={editForm.risk_limit}
                onChange={(e) => setEditForm((prev) => ({ ...prev, risk_limit: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="İskonto Oranı (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={editForm.discount_rate}
                onChange={(e) => setEditForm((prev) => ({ ...prev, discount_rate: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Yetkili Kişi Adı"
                value={editForm.authorized_person_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, authorized_person_name: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Yetkili Kişi Telefonu"
                value={editForm.authorized_person_phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, authorized_person_phone: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={updateCustomer} disabled={loading || !editForm.name.trim()}>
                Güncelle
              </Button>
              <Button variant="outline" onClick={() => setSelectedAccount(null)}>
                Kapat
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Müşteri Ekleme Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setForm({ name: '', email: '', phone: '', address: '', tax_number: '', risk_limit: '', discount_rate: '', authorized_person_name: '', authorized_person_phone: '' })
        }}
        title="Yeni Müşteri Ekle"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Müşteri adı *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="E-posta"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Telefon"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Vergi No"
              value={form.tax_number}
              onChange={(e) => setForm((prev) => ({ ...prev, tax_number: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Adres"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Risk Limiti (TL)"
              type="number"
              step="0.01"
              value={form.risk_limit}
              onChange={(e) => setForm((prev) => ({ ...prev, risk_limit: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="İskonto Oranı (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.discount_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, discount_rate: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Yetkili Kişi Adı"
              value={form.authorized_person_name}
              onChange={(e) => setForm((prev) => ({ ...prev, authorized_person_name: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Yetkili Kişi Telefonu"
              value={form.authorized_person_phone}
              onChange={(e) => setForm((prev) => ({ ...prev, authorized_person_phone: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                setForm({ name: '', email: '', phone: '', address: '', tax_number: '', risk_limit: '', discount_rate: '', authorized_person_name: '', authorized_person_phone: '' })
              }}
            >
              İptal
            </Button>
            <Button onClick={createCustomer} disabled={loading || !form.name.trim()}>
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
