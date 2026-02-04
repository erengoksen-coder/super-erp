'use client'

import Link from 'next/link'
import { BookOpen, BookOpenCheck, ListChecks, Plus, DollarSign } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

export default function FinancePage() {
  return (
    <AppDashboardLayout
      title="Finans & Muhasebe"
      subtitle="Logo tarzı çift taraflı kayıt sistemi"
      icon={DollarSign}
      actions={
        <Link href="/finance/new">
          <Button variant="solid" color="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Fiş
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/finance/chart-of-accounts">
          <Card className="hover:border-blue-500 transition cursor-pointer">
            <CardBody>
              <div className="flex items-center space-x-3 mb-2">
                <BookOpen className="w-6 h-6 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Hesap Planı</h2>
              </div>
              <p className="text-sm text-gray-400">Hesap kodları ve bakiyeler</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/finance/journal-entries">
          <Card className="hover:border-blue-500 transition cursor-pointer">
            <CardBody>
              <div className="flex items-center space-x-3 mb-2">
                <ListChecks className="w-6 h-6 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Yevmiye Kayıtları</h2>
              </div>
              <p className="text-sm text-gray-400">Günlük muhasebe fişleri</p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/finance/general-ledger">
          <Card className="hover:border-blue-500 transition cursor-pointer">
            <CardBody>
              <div className="flex items-center space-x-3 mb-2">
                <BookOpenCheck className="w-6 h-6 text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Defter-i Kebir</h2>
              </div>
              <p className="text-sm text-gray-400">Hesap bazlı hareketler</p>
            </CardBody>
          </Card>
        </Link>
      </div>
    </AppDashboardLayout>
  )
}
