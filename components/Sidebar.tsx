'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, Users, Clock, Wallet, 
  Network, Settings, LogOut,
  ChevronRight, LayoutDashboard,
  Briefcase, BarChart3, ShieldCheck
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/hr', icon: LayoutDashboard },
  { name: 'Puantaj & Takip', href: '/hr/attendance', icon: Clock },
  { name: 'Personel Rehberi', href: '/hr/employees', icon: Users },
  { name: 'Bordro Yönetimi', href: '/hr/payroll', icon: Wallet },
  { name: 'Organizasyon', href: '/hr/organization', icon: Network },
  { name: 'İşe Alım (ATS)', href: '/hr/recruitment', icon: Briefcase },
  { name: 'Zimmet Takibi', href: '/hr/equipment', icon: ShieldCheck },
  { name: 'Ayarlar', href: '/hr/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-gray-950 border-r border-gray-900 group transition-all duration-500 hover:w-80 z-50">
      <div className="flex flex-col h-full p-6 space-y-10">
        {/* Logo Section */}
        <div className="flex items-center gap-4 px-2">
           <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/30">
              <span className="text-white font-black text-xl italic">L</span>
           </div>
           <div className="flex flex-col">
              <span className="text-white font-black text-sm uppercase tracking-tighter">Livasofa Pro</span>
              <span className="text-gray-600 font-black text-[9px] uppercase tracking-[0.2em]">ERP System v4</span>
           </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-2">
           {navItems.map((item) => {
             const isActive = pathname === item.href
             return (
               <Link 
                 key={item.href}
                 href={item.href}
                 className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group/item ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-95' : 'text-gray-500 hover:bg-gray-900 hover:text-white'}`}
               >
                 <item.icon className={`w-5 h-5 transition-transform duration-500 group-hover/item:scale-110 ${isActive ? 'text-white' : 'text-gray-600 group-hover/item:text-blue-500'}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                 {isActive && <ChevronRight className="ml-auto w-3 h-3 text-white/50" />}
               </Link>
             )
           })}
        </nav>

        {/* Footer Sidebar Section */}
        <div className="pt-6 border-t border-gray-900">
           <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-600 hover:bg-red-500/10 hover:text-red-500 transition-all group/logout">
              <LogOut className="w-5 h-5 group-hover/logout:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Çıkış Yap</span>
           </button>
        </div>
      </div>
    </aside>
  )
}
