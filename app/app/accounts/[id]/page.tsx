'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Truck, Edit, Save, X, Percent, DollarSign } from 'lucide-react'

interface Account {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string
  phone?: string
  email?: string
  address?: string
  balance: number
}

interface Shipment {
  id: string
  shipment_number: string
  shipment_date: string
  total_quantity: number
  total_amount: number
  tax_rate: number
  tax_amount: number
  final_amount: number
  status: string
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null)
  const [taxRate, setTaxRate] = useState<string>('')

  useEffect(() => {
    const id = params?.id as string
    if (id && id !== 'undefined') {
      loadAccount(id)
      loadShipments(id)
    }
  }, [params?.id])

  async function loadAccount(id: string) {
    try {
      const response = await fetch(`/api/accounts/${id}`)
      if (!response.ok) throw new Error('Cari hesap yüklenemedi')
      const data = await response.json()
      setAccount(data)
    } catch (error) {
      console.error('Error loading account:', error)
      alert('Cari hesap yüklenirken hata oluştu')
      router.push('/accounts')
    } finally {
      setLoading(false)
    }
  }

  async function loadShipments(accountId: string) {
    try {
      const response = await fetch(`/api/shipments?customer_id=${accountId}`)
      if (!response.ok) throw new Error('Sevkiyatlar yüklenemedi')
      const data = await response.json()
      setShipments(data)
    } catch (error) {
      console.error('Error loading shipments:', error)
    }
  }

  function startEditTax(shipment: Shipment) {
    setEditingShipmentId(shipment.id)
    setTaxRate(shipment.tax_rate?.toString() || '0')
  }

  function cancelEdit() {
    setEditingShipmentId(null)
    setTaxRate('')
  }

  async function saveTaxRate(shipmentId: string) {
    if (!taxRate || parseFloat(taxRate) < 0 || parseFloat(taxRate) > 100) {
      alert('KDV oranı 0-100 arasında olmalıdır')
      return
    }

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/tax`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_rate: parseFloat(taxRate),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'KDV güncellenemedi')
      }

      alert('✅ KDV başarıyla güncellendi!')
      setEditingShipmentId(null)
      setTaxRate('')
      
      // Sevkiyatları yeniden yükle
      if (account) {
        loadShipments(account.id)
        loadAccount(account.id) // Bakiye güncellenmiş olabilir
      }
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Cari hesap bulunamadı</p>
          <button
            onClick={() => router.push('/accounts')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/accounts')}
            className="text-blue-400 hover:text-blue-300 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Geri</span>
          </button>
        </div>

        {/* Cari Hesap Bilgileri */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-4">{account.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Kod:</div>
              <div className="text-white font-mono">{account.code}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Tip:</div>
              <div className="text-white">
                {account.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
              </div>
            </div>
            {account.tax_number && (
              <div>
                <div className="text-gray-400 mb-1">Vergi No:</div>
                <div className="text-white">{account.tax_number}</div>
              </div>
            )}
            {account.phone && (
              <div>
                <div className="text-gray-400 mb-1">Telefon:</div>
                <div className="text-white">{account.phone}</div>
              </div>
            )}
            {account.email && (
              <div>
                <div className="text-gray-400 mb-1">E-posta:</div>
                <div className="text-white">{account.email}</div>
              </div>
            )}
            {account.address && (
              <div className="md:col-span-2">
                <div className="text-gray-400 mb-1">Adres:</div>
                <div className="text-white">{account.address}</div>
              </div>
            )}
            <div>
              <div className="text-gray-400 mb-1">Bakiye:</div>
              <div className={`text-lg font-bold ${
                account.balance > 0 ? 'text-green-400' : 
                account.balance < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {account.balance.toLocaleString('tr-TR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} ₺
              </div>
            </div>
          </div>
        </div>

        {/* Sevkiyatlar */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Sevk Fişleri</span>
          </h2>

          {shipments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Bu müşteriye ait sevkiyat bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Sevk No</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-400">Tarih</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Adet</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Ara Toplam</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">KDV %</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">KDV Tutarı</th>
                    <th className="text-right py-2 px-3 text-xs text-gray-400">Genel Toplam</th>
                    <th className="text-center py-2 px-3 text-xs text-gray-400">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => (
                    <tr key={shipment.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-2 px-3 text-xs text-white font-mono">
                        <a
                          href={`/shipments/${shipment.id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {shipment.shipment_number}
                        </a>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300">
                        {new Date(shipment.shipment_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {shipment.total_quantity}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {shipment.total_amount?.toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || '0,00'} ₺
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {editingShipmentId === shipment.id ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={taxRate}
                            onChange={(e) => setTaxRate(e.target.value)}
                            className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                            placeholder="0"
                          />
                        ) : (
                          <span>{shipment.tax_rate || 0}%</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-300 text-right">
                        {shipment.tax_amount?.toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || '0,00'} ₺
                      </td>
                      <td className="py-2 px-3 text-xs font-semibold text-white text-right">
                        {shipment.final_amount?.toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || shipment.total_amount?.toLocaleString('tr-TR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }) || '0,00'} ₺
                      </td>
                      <td className="py-2 px-3 text-center">
                        {editingShipmentId === shipment.id ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => saveTaxRate(shipment.id)}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                              title="Kaydet"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              title="İptal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditTax(shipment)}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            title="KDV Düzenle"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

