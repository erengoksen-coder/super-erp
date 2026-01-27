'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { generateInventoryCode } from '@/lib/utils/codeGenerator'

export default function NewInventoryPage() {
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)

  useEffect(() => {
    async function loadCode() {
      try {
        const newCode = await generateInventoryCode()
        setCode(newCode)
      } catch (error) {
        console.error('Error generating code:', error)
        setCode('STK-001')
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <Link href="/inventory" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          ← Geri Dön
        </Link>
        <h1 className="text-3xl font-bold text-white">Yeni Stok Kartı</h1>
        <p className="text-gray-400 mt-1">Yeni stok kartı oluşturun</p>
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Stok Kodu *
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
                  value={code}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg cursor-not-allowed opacity-75"
                  placeholder="Örn: STK-001"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">Kod otomatik oluşturuldu</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/inventory"
                className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
              >
                İptal
              </Link>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Kaydet
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

