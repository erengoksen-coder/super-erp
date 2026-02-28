'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="max-w-md text-center space-y-6 p-8">
        {/* Animated offline icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full animate-pulse" />
          <svg className="relative w-24 h-24 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" />
            <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeWidth="2" className="text-red-400" />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Çevrimdışısınız
          </h1>
          <p className="text-gray-400 leading-relaxed">
            İnternet bağlantınız kesildi. Bağlantı geri geldiğinde
            sayfa otomatik olarak yenilenecektir.
          </p>
        </div>

        {/* Son erişilen sayfalar */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-sm text-gray-500 mb-3">Çevrimdışı kullanılabilir:</p>
          <div className="space-y-2 text-left">
            <a href="/" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/60 transition">
              <span className="text-lg">🏠</span>
              <span className="text-sm text-gray-300">Ana Sayfa</span>
            </a>
            <a href="/dashboard" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/60 transition">
              <span className="text-lg">📊</span>
              <span className="text-sm text-gray-300">Kontrol Paneli</span>
            </a>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/25"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Yeniden Dene
        </button>

        <p className="text-xs text-gray-600">
          Barkod okuyucu ve temel navigasyon çevrimdışı çalışmaya devam eder.
        </p>
      </div>
    </div>
  )
}
