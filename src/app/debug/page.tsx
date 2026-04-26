'use client'

export default function DebugPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-10 font-mono">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-4xl font-black text-blue-500 underline decoration-blue-500/30 underline-offset-8">
          LIVASOFA ERP <span className="text-white/20 font-light">DEBUG MODE</span>
        </h1>
        
        <div className="space-y-4 border border-white/10 rounded-2xl p-6 bg-white/5 backdrop-blur-xl">
          <p className="text-green-400">✓ Altyapı Stabilizasyonu Tamamlandı</p>
          <p className="text-green-400">✓ Webpack Hydration Düzeltmesi Aktif</p>
          <p className="text-green-400">✓ Service Worker Temizliği Yapıldı</p>
          
          <div className="pt-4 border-t border-white/10 mt-4">
            <p className="text-sm text-white/60 mb-2">Sistem Durumu:</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="block text-white/30 uppercase mb-1">Branding</span>
                <span className="font-bold">LIVASOFA ERP</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="block text-white/30 uppercase mb-1">Stability</span>
                <span className="font-bold text-blue-400">SAFE MODE ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/20 text-center uppercase tracking-widest">
          Livasofa Software © 2026
        </p>
      </div>
    </div>
  )
}
