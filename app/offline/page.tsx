export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Çevrimdışısınız</h1>
        <p className="text-gray-400">
          İnternet bağlantısı yok. Bağlantı geri geldiğinde sayfayı yenileyin.
        </p>
      </div>
    </div>
  )
}
