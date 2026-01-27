'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Building2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

interface Account {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string
  phone?: string
  email?: string
  balance: number
  created_at: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadAccounts()
  }, [filterType])

  async function loadAccounts() {
    try {
      const url = filterType === 'all' 
        ? '/api/accounts'
        : `/api/accounts?type=${filterType}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Cari hesaplar yüklenemedi')
      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter((account) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      account.name.toLowerCase().includes(searchLower) ||
      account.code.toLowerCase().includes(searchLower) ||
      (account.tax_number && account.tax_number.toLowerCase().includes(searchLower)) ||
      (account.phone && account.phone.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Cari Hesaplar</h1>
          <p className="text-gray-400 mt-1">Müşteri ve tedarikçi yönetimi</p>
        </div>
        <Link
          href="/accounts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Yeni Cari Hesap</span>
        </Link>
      </div>

      {/* Filtreler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Ara (Ad, Kod, Vergi No, Telefon)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ara..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tip Filtresi
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tümü</option>
              <option value="customer">Müşteri</option>
              <option value="supplier">Tedarikçi</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">Kod</TableHead>
                <TableHead className="h-8">Ad/Ünvan</TableHead>
                <TableHead className="h-8">Tip</TableHead>
                <TableHead className="h-8">Vergi No</TableHead>
                <TableHead className="h-8">Telefon</TableHead>
                <TableHead className="h-8">Bakiye</TableHead>
                <TableHead className="h-8">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 text-xs py-8">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz cari hesap eklenmemiş'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow 
                    key={account.id}
                    className="cursor-pointer hover:bg-gray-800"
                    onDoubleClick={() => {
                      if (account.type === 'customer') {
                        window.location.href = `/accounts/${account.id}`
                      }
                    }}
                  >
                    <TableCell>
                      <div className="text-xs font-mono font-bold text-white">
                        {account.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-white">{account.name}</div>
                    </TableCell>
                    <TableCell>
                      {account.type === 'customer' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                          <Users className="w-3 h-3 mr-1" />
                          Müşteri
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                          <Building2 className="w-3 h-3 mr-1" />
                          Tedarikçi
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.tax_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.phone || '-'}
                    </TableCell>
                    <TableCell className={`text-xs font-semibold ${
                      account.balance > 0 ? 'text-green-400' : 
                      account.balance < 0 ? 'text-red-400' : 
                      'text-gray-400'
                    }`}>
                      {account.balance.toLocaleString('tr-TR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} ₺
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {new Date(account.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Cari Hesap</div>
          <div className="text-2xl font-bold text-white">{accounts.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Müşteri</div>
          <div className="text-2xl font-bold text-blue-400">
            {accounts.filter((a) => a.type === 'customer').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Tedarikçi</div>
          <div className="text-2xl font-bold text-green-400">
            {accounts.filter((a) => a.type === 'supplier').length}
          </div>
        </div>
      </div>
    </div>
  )
}

