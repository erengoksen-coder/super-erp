import { Users } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import HrClient from './HrClient'

export default function HrPage() {
  return (
    <AppDashboardLayout
      title="İnsan Kaynakları"
      subtitle="Personel yönetimi ve bordro akışları"
      icon={Users}
    >
      <HrClient />
    </AppDashboardLayout>
  )
}
