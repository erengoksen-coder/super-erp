export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Faturalar</h1>
            <p className="text-gray-600 mt-1">Alış ve satış faturaları</p>
          </div>
          <a
            href="/invoices/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-block"
          >
            + Yeni Fatura
          </a>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Fatura yönetimi yakında eklenecek...</p>
        </div>
      </div>
    </div>
  )
}

