import Link from 'next/link'
import { BookOpen, BookOpenCheck, ListChecks, Plus } from 'lucide-react'

export default function FinancePage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Finans & Muhasebe</h1>
          <p className="text-gray-400 mt-1">Logo tarzı çift taraflı kayıt sistemi</p>
        </div>
        <Link
          href="/finance/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Yeni Fiş</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/finance/chart-of-accounts"
          className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:border-blue-500 transition"
        >
          <div className="flex items-center space-x-3 mb-2">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Hesap Planı</h2>
          </div>
          <p className="text-sm text-gray-400">Hesap kodları ve bakiyeler</p>
        </Link>

        <Link
          href="/finance/journal-entries"
          className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:border-blue-500 transition"
        >
          <div className="flex items-center space-x-3 mb-2">
            <ListChecks className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Yevmiye Kayıtları</h2>
          </div>
          <p className="text-sm text-gray-400">Günlük muhasebe fişleri</p>
        </Link>

        <Link
          href="/finance/general-ledger"
          className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:border-blue-500 transition"
        >
          <div className="flex items-center space-x-3 mb-2">
            <BookOpenCheck className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Defter-i Kebir</h2>
          </div>
          <p className="text-sm text-gray-400">Hesap bazlı hareketler</p>
        </Link>
      </div>
    </div>
  )
}

