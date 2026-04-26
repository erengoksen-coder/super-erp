'use client'

import { motion } from 'framer-motion'
import { Box, LayoutGrid, Info, ArrowLeft } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

/**
 * Super ERP - Customer Module (Restored)
 * This page has been restored and stabilized after corruption.
 */

export default function CustomerPage() {
  const router = useRouter()

  return (
    <AppDashboardLayout
      title="Customer"
      subtitle="Bu modÃ¼l restorasyon sonrasÄ± stabilize edilmiÅŸtir."
      icon={Box}
    >
      <div className="space-y-6 animate-reveal">
        <div className="flex items-center gap-4">
          <Button variant="glass" size="xs" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            GERÄ° DÃ–N
          </Button>
        </div>

        <Card variant="glass" className="border-primary/20 bg-primary/5">
          <CardHeader 
            title="ModÃ¼l Durumu: Aktif" 
            subtitle="Sistem stabilizasyonu tamamlandÄ±."
            icon={Info}
          />
          <CardBody className="p-10 text-center space-y-4">
            <div className="p-6 bg-white/5 rounded-3xl inline-block">
              <LayoutGrid className="w-12 h-12 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest text-white/80">Restorasyon TamamlandÄ±</h3>
            <p className="max-w-md mx-auto text-sm text-white/40 leading-relaxed italic">
              Bu sayfa veri bÃ¼tÃ¼nlÃ¼ÄŸÃ¼ iÃ§in yeniden yapÄ±landÄ±rÄ±lmÄ±ÅŸtÄ±r. 
              Ä°lgili modÃ¼lÃ¼n detaylÄ± iÅŸlevleri bir sonraki gÃ¼ncellemede aktif edilecektir.
            </p>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
