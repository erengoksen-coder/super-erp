'use client'

import Link from 'next/link'
import { Users, Calendar, FileSpreadsheet, Wallet, Building2, ClipboardList, BarChart3 } from 'lucide-react'

const cards = [
  { href: '/hr/employees', title: 'Çalışanlar', icon: Users, desc: 'Profil, kontrat, ücret, özel alan' },
  { href: '/hr/organization', title: 'Organizasyon', icon: Building2, desc: 'Departman, ekip, işyeri' },
  { href: '/hr/timeoff', title: 'İzinler', icon: Calendar, desc: 'İzin talepleri ve onay' },
  { href: '/hr/attendance', title: 'Puantaj', icon: FileSpreadsheet, desc: 'Giriş/çıkış, devamsızlık' },
  { href: '/hr/payroll', title: 'Bordro', icon: Wallet, desc: 'Bordro kayıtları' },
  { href: '/hr/holidays', title: 'Tatiller', icon: ClipboardList, desc: 'Resmi tatiller' },
  { href: '/hr/reports', title: 'Raporlar', icon: BarChart3, desc: 'Özet raporlar' },
]

export default function HrDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">İK Paneli</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((item) => (
          <Link key={item.href} href={item.href} className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500 transition">
            <div className="flex items-center space-x-2 text-white">
              <item.icon className="w-5 h-5 text-blue-400" />
              <div className="font-medium">{item.title}</div>
            </div>
            <div className="text-sm text-gray-400 mt-2">{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
