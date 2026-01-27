'use client'

import Link from 'next/link'

export default function NewFinancePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/finance" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Geri Dön
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Yeni Muhasebe Fişi</h1>
          <p className="text-gray-600 mt-1">Yeni muhasebe fişi oluşturun</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Muhasebe fişi formu yakında eklenecek...</p>
        </div>
      </div>
    </div>
  )
}


