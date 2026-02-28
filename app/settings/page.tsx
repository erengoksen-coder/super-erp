'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Settings, Lock, ChevronRight, FileSpreadsheet, MessageCircle } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'

export default function SettingsPage() {
  useEffect(() => { document.title = 'Ayarlar - LIVASOFA ERP'; return () => { document.title = 'LIVASOFA ERP' } }, [])
  return (
    <AppDashboardLayout title="Ayarlar" subtitle="Sistem ve hesap ayarları" icon={Settings}>
      <div className="max-w-2xl space-y-4">
        <Link
          href="/settings/change-password"
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 hover:bg-gray-800/50 transition"
        >
          <div className="p-2 rounded-lg bg-gray-800">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">Şifre değiştir</p>
            <p className="text-sm text-gray-400">Hesap şifrenizi güncelleyin</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </Link>
        <Link
          href="/settings/data-transfer"
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 hover:bg-gray-800/50 transition"
        >
          <div className="p-2 rounded-lg bg-gray-800">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">Veri aktarımı</p>
            <p className="text-sm text-gray-400">Excel ile toplu içe ve dışa aktarma</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </Link>
        <Link
          href="/settings/messaging"
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 hover:bg-gray-800/50 transition"
        >
          <div className="p-2 rounded-lg bg-gray-800">
            <MessageCircle className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">WhatsApp / Telegram bildirimleri</p>
            <p className="text-sm text-gray-400">Sipariş bildirim botu ayarları</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </Link>
      </div>
    </AppDashboardLayout>
  )
}


