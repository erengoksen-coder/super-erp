import { Handshake } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import CrmClient from './CrmClient'

export default function CrmPage() {
  return (
    <AppDashboardLayout
      title="CRM"
      subtitle="Müşteri ilişkileri ve satış fırsatları"
      icon={Handshake}
    >
      <CrmClient />
    </AppDashboardLayout>
  )
}
