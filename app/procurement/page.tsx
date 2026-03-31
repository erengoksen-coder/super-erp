import { ClipboardList } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import ProcurementClient from './ProcurementClient'

export default function ProcurementPage() {
  return (
    <AppDashboardLayout
      title="Satın Alma"
      subtitle="Tedarikçi ve satın alma süreçleri"
      icon={ClipboardList}
    >
      <ProcurementClient />
    </AppDashboardLayout>
  )
}
