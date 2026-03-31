'use client'

import React from 'react'
import FixedAssetsClient from './FixedAssetsClient'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Landmark, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function FixedAssetsPage() {
  return (
    <AppDashboardLayout
      title="Sabit Kıymetler & Varlıklar"
      subtitle="Şirket demirbaşları, amortisman takibi ve lokasyon yönetimi"
      icon={Landmark}
      actions={
         <Button variant="solid" color="primary" size="sm" className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            YENİ VARLIK KAYDI
         </Button>
      }
    >
      <FixedAssetsClient />
    </AppDashboardLayout>
  )
}
