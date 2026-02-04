import { Landmark } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import ModulePlaceholder from '@/components/ModulePlaceholder'

export default function FixedAssetsPage() {
  return (
    <AppDashboardLayout
      title="Sabit Kıymet Yönetimi"
      subtitle="Amortisman ve varlık takibi"
      icon={Landmark}
    >
      <ModulePlaceholder
        title="Sabit kıymet modülü hazırlık aşamasında"
        description="Varlık envanteri ve amortisman planı için temel yapı planlandı."
        features={[
          'Varlık kartları ve lokasyon takibi',
          'Amortisman planları',
          'Bakım ve servis kayıtları',
          'Değerleme raporları',
        ]}
      />
    </AppDashboardLayout>
  )
}
