export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finans & Muhasebe</h1>
            <p className="text-gray-600 mt-1">Logo tarzı çift taraflı kayıt sistemi</p>
          </div>
          <a
            href="/finance/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-block"
          >
            + Yeni Fiş
          </a>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Finans modülü yakında eklenecek...</p>
        </div>
      </div>
    </div>
  )
}

