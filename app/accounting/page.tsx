import { BookOpen } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import AccountingClient from './AccountingClient'

export default function AccountingPage() {
  return (
    <AppDashboardLayout
      title="Muhasebe"
      subtitle="Mali tablolar, KDV ve finansal raporlama"
      icon={BookOpen}
    >
      <AccountingClient />
    </AppDashboardLayout>
  )
}
