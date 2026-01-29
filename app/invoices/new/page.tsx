'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { generateInvoiceNumber } from '@/lib/utils/codeGenerator'

export default function NewInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>('sale')

  useEffect(() => {
    async function loadCode() {
      try {
        const newCode = await generateInvoiceNumber(invoiceType)
        setInvoiceNumber(newCode)
      } catch (error) {
        console.error('Error generating code:', error)
        const year = new Date().getFullYear()
        setInvoiceNumber(invoiceType === 'sale' ? `SAT-${year}-001` : `ALI-${year}-001`)
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
  }, [invoiceType])

  return (
    <div>
      <div className="mb-6">
        <Link href="/invoices" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Fatura</h1>
        <p className="text-gray-400 mt-1">Yeni fatura oluşturun</p>
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
            Satış faturaları sevkiyatlardan oluşturulur. Bu ekran yalnızca bilgi amaçlıdır.
          </div>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fatura Tipi *
              </label>
              <select
                value={invoiceType}
                onChange={(e) => {
                  setInvoiceType(e.target.value as 'sale' | 'purchase')
                  setCodeLoading(true)
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sale">Satış Faturası</option>
                <option value="purchase">Alış Faturası</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fatura No *
              </label>
              {codeLoading ? (
                <div className="w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800">
                  <span className="text-gray-400">Kod oluşturuluyor...</span>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  readOnly
                  value={invoiceNumber}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg cursor-not-allowed opacity-75"
                  placeholder={invoiceType === 'sale' ? 'Örn: SAT-2024-001' : 'Örn: ALI-2024-001'}
                />
              )}
              <p className="text-xs text-gray-400 mt-1">Kod otomatik oluşturuldu (yıl bazlı)</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/invoices"
                className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
              >
                İptal
              </Link>
              <button
                type="button"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg cursor-not-allowed opacity-70"
                disabled
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}

