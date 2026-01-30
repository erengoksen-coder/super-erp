'use client'

import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

type Employee = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  contracts?: Array<{
    id?: string
    contract_type?: string | null
    start_date?: string | null
    end_date?: string | null
    work_hours_per_week?: number | null
    probation_end_date?: string | null
    status?: string | null
  }>
  compensation?: Array<{
    id?: string
    effective_from?: string | null
    effective_to?: string | null
    base_salary?: number | null
    salary_currency?: string | null
    bonus?: number | null
    allowance?: number | null
    notes?: string | null
  }>
  custom_fields?: Array<{
    field_key?: string
    field_value?: string | null
  }>
}

export default function HrEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [contractForm, setContractForm] = useState({
    contract_type: '',
    start_date: '',
    end_date: '',
    work_hours_per_week: '45',
    probation_end_date: '',
    status: 'active',
  })
  const [compForm, setCompForm] = useState({
    effective_from: '',
    effective_to: '',
    base_salary: '',
    salary_currency: 'TRY',
    bonus: '',
    allowance: '',
    notes: '',
  })
  const [customFieldForm, setCustomFieldForm] = useState({
    field_key: '',
    field_value: '',
  })
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    try {
      const data = await fetchApi('/api/hr/employees')
      setEmployees(data?.employees || [])
    } catch (error) {
      console.error('Çalışanlar yüklenemedi:', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const selectedEmployee = selectedId
    ? employees.find((employee) => employee.id === selectedId) || null
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      alert('Ad soyad gerekli')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status || 'active',
      }
      if (editingId) {
        await fetchApi('/api/hr/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      } else {
        await fetchApi('/api/hr/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setEditingId(null)
      setForm({ full_name: '', email: '', phone: '', status: 'active' })
      await loadEmployees()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: Employee) {
    setEditingId(item.id)
    setForm({
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      status: item.status || 'active',
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Çalışan silinsin mi?')) return
    try {
      await fetchApi(`/api/hr/employees?id=${id}`, { method: 'DELETE' })
      if (editingId === id) {
        setEditingId(null)
        setForm({ full_name: '', email: '', phone: '', status: 'active' })
      }
      await loadEmployees()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  async function addContract(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    await fetchApi('/api/hr/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        contracts: [{
          contract_type: contractForm.contract_type || null,
          start_date: contractForm.start_date || null,
          end_date: contractForm.end_date || null,
          work_hours_per_week: Number(contractForm.work_hours_per_week || 45),
          probation_end_date: contractForm.probation_end_date || null,
          status: contractForm.status || 'active',
        }],
      }),
    })
    setContractForm({
      contract_type: '',
      start_date: '',
      end_date: '',
      work_hours_per_week: '45',
      probation_end_date: '',
      status: 'active',
    })
    await loadEmployees()
  }

  async function addCompensation(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    await fetchApi('/api/hr/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        compensation: [{
          effective_from: compForm.effective_from || null,
          effective_to: compForm.effective_to || null,
          base_salary: Number(compForm.base_salary || 0),
          salary_currency: compForm.salary_currency || 'TRY',
          bonus: Number(compForm.bonus || 0),
          allowance: Number(compForm.allowance || 0),
          notes: compForm.notes || null,
        }],
      }),
    })
    setCompForm({
      effective_from: '',
      effective_to: '',
      base_salary: '',
      salary_currency: 'TRY',
      bonus: '',
      allowance: '',
      notes: '',
    })
    await loadEmployees()
  }

  async function addCustomField(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !customFieldForm.field_key.trim()) return
    await fetchApi('/api/hr/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedId,
        custom_fields: [{
          field_key: customFieldForm.field_key.trim(),
          field_value: customFieldForm.field_value || null,
        }],
      }),
    })
    setCustomFieldForm({ field_key: '', field_value: '' })
    await loadEmployees()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <Users className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Çalışanlar</h1>
          <p className="text-gray-400 text-sm">Yeni İK çalışan kayıtları.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
            placeholder="Ad Soyad"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
            placeholder="E-posta"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
            placeholder="Telefon"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Çalışan Ekle'}
          </button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-3">Ad Soyad</th>
              <th className="text-left py-2 px-3">E-posta</th>
              <th className="text-left py-2 px-3">Telefon</th>
              <th className="text-left py-2 px-3">Durum</th>
              <th className="text-right py-2 px-3">İşlemler</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">Yükleniyor...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-6">Kayıt yok.</td>
              </tr>
            ) : (
              employees.map((item) => (
                <tr key={item.id} className="border-t border-gray-800">
                  <td className="py-2 px-3">{item.full_name}</td>
                  <td className="py-2 px-3">{item.email || '-'}</td>
                  <td className="py-2 px-3">{item.phone || '-'}</td>
                  <td className="py-2 px-3">{item.status || '-'}</td>
                  <td className="py-2 px-3 text-right space-x-2">
                    <button onClick={() => setSelectedId(item.id)} className="text-emerald-400 hover:text-emerald-300">Detay</button>
                    <button onClick={() => startEdit(item)} className="text-blue-400 hover:text-blue-300">Düzenle</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">Sil</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-6">
        <div className="text-white font-medium mb-2">Çalışan Detayları</div>
        {!selectedEmployee ? (
          <div className="text-gray-400 text-sm">Detay için bir çalışan seçin.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Kontratlar</div>
              <form onSubmit={addContract} className="space-y-2">
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Tip" value={contractForm.contract_type} onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })} />
                <input type="date" className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} />
                <input type="date" className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} />
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Haftalık saat" value={contractForm.work_hours_per_week} onChange={(e) => setContractForm({ ...contractForm, work_hours_per_week: e.target.value })} />
                <select className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">Ekle</button>
              </form>
              <div className="mt-3 text-xs text-white space-y-1">
                {(selectedEmployee.contracts || []).map((c, index) => (
                  <div key={`${c.id || index}`}>{c.contract_type || '-'} • {c.start_date || '-'} → {c.end_date || '-'}</div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Ücret / Kıdem</div>
              <form onSubmit={addCompensation} className="space-y-2">
                <input type="date" className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" value={compForm.effective_from} onChange={(e) => setCompForm({ ...compForm, effective_from: e.target.value })} />
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Maaş" value={compForm.base_salary} onChange={(e) => setCompForm({ ...compForm, base_salary: e.target.value })} />
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Prim" value={compForm.bonus} onChange={(e) => setCompForm({ ...compForm, bonus: e.target.value })} />
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Ödenek" value={compForm.allowance} onChange={(e) => setCompForm({ ...compForm, allowance: e.target.value })} />
                <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">Ekle</button>
              </form>
              <div className="mt-3 text-xs text-white space-y-1">
                {(selectedEmployee.compensation || []).map((c, index) => (
                  <div key={`${c.id || index}`}>{c.effective_from || '-'} • {Number(c.base_salary || 0).toFixed(2)}</div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">Özel Alanlar</div>
              <form onSubmit={addCustomField} className="space-y-2">
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Anahtar" value={customFieldForm.field_key} onChange={(e) => setCustomFieldForm({ ...customFieldForm, field_key: e.target.value })} />
                <input className="w-full px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded" placeholder="Değer" value={customFieldForm.field_value} onChange={(e) => setCustomFieldForm({ ...customFieldForm, field_value: e.target.value })} />
                <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">Ekle</button>
              </form>
              <div className="mt-3 text-xs text-white space-y-1">
                {(selectedEmployee.custom_fields || []).map((f, index) => (
                  <div key={`${f.field_key || index}`}>{f.field_key}: {f.field_value || '-'}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
