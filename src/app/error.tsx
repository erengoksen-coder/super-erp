'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Sistem Hatası:', error)
  }, [error])

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-reveal">
      <Card variant="glass" className="max-w-xl w-full border-red-500/20 bg-red-500/[0.02] shadow-glow shadow-red-500/5">
        <CardBody className="p-12 text-center space-y-8">
          <div className="mx-auto w-24 h-24 rounded-[2rem] bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-glow shadow-red-500/20">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight italic italic">SİSTEM KESİNTİSİ</h1>
            <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest leading-relaxed">BEKLENMEDİK BİR HATA OLUŞTU. İŞLEMİNİZİ GERÇEKLEŞTİREMEDİK.</p>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-[11px] text-red-400/80 text-left overflow-auto max-h-40 custom-scrollbar">
            <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 <span className="font-black tracking-widest uppercase opacity-40 italic">Hata Detayı</span>
            </div>
            {error.message || 'Bilinmeyen sistem hatası.'}
            {error.digest && <div className="mt-2 opacity-30">ID: {error.digest}</div>}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
                onClick={reset} 
                color="primary" 
                size="lg" 
                className="w-full sm:w-auto px-10 h-14 rounded-2xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20"
            >
              <RefreshCcw className="w-5 h-5 mr-3" /> TEKRAR DENE
            </Button>
            <Button 
                onClick={() => router.push(ROUTES.HOME)} 
                variant="ghost" 
                size="lg" 
                className="w-full sm:w-auto px-8 h-14 rounded-2xl font-black uppercase tracking-widest text-foreground/40 hover:text-white transition-all italic hover:bg-white/5"
            >
              <Home className="w-5 h-5 mr-3" /> ANA SAYFA
            </Button>
          </div>
          
          <div className="pt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-foreground/20 uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" /> TEKNİK DESTEK EKİBİNE BİLDİRİLDİ
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
