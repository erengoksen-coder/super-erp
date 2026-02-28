'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    ShoppingCart,
    Box,
    Truck,
    PlusCircle,
    FileText
} from 'lucide-react'

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            {/* Heavy frosted glass backdrop */}
            <div
                className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xl transition-all duration-300 animate-fade-in"
                onClick={() => setOpen(false)}
            />

            <Command
                className="relative z-[101] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)] animate-fade-in-up"
                shouldFilter={true}
            >
                <div className="flex items-center border-b border-slate-700/50 px-4">
                    <Search className="mr-3 h-5 w-5 text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                    <Command.Input
                        className="flex h-16 w-full bg-transparent text-lg text-slate-100 placeholder:text-slate-500 focus:outline-none"
                        placeholder="Ne yapmak istersiniz? (örn: sipariş arayın...)"
                        autoFocus
                    />
                </div>

                <Command.List className="max-h-[60vh] overflow-y-auto p-2 overscroll-contain">
                    <Command.Empty className="py-6 text-center text-sm text-slate-400">Sonuç bulunamadı.</Command.Empty>

                    <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Hızlı İşlemler</div>}>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/orders?new=1'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-blue-500/10 hover:text-blue-400 aria-selected:bg-blue-500/15 aria-selected:text-blue-400 data-[selected]:bg-blue-500/15 data-[selected]:text-blue-400 transition-colors"
                        >
                            <PlusCircle className="mr-3 h-4 w-4" />
                            <span>Yeni Sipariş Oluştur</span>
                            <span className="ml-auto text-xs text-slate-500 group-hover:text-blue-400/50">Hızlı Kısayol</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/accounts?new=1'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-blue-500/10 hover:text-blue-400 aria-selected:bg-blue-500/15 aria-selected:text-blue-400 data-[selected]:bg-blue-500/15 data-[selected]:text-blue-400 transition-colors"
                        >
                            <User className="mr-3 h-4 w-4" />
                            <span>Yeni Cari Ekle</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Separator className="my-1 h-px bg-slate-700/50" />

                    <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Sayfalar & Modüller</div>}>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/orders'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <ShoppingCart className="mr-3 h-4 w-4 text-emerald-400" />
                            <span>Satış Siparişleri</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/materials'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <Box className="mr-3 h-4 w-4 text-amber-400" />
                            <span>Stok & Depo</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/accounts'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <CreditCard className="mr-3 h-4 w-4 text-indigo-400" />
                            <span>Cari Hesaplar</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/waybills'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <Truck className="mr-3 h-4 w-4 text-cyan-400" />
                            <span>İrsaliye Listesi</span>
                        </Command.Item>
                    </Command.Group>

                    <Command.Separator className="my-1 h-px bg-slate-700/50" />

                    <Command.Group heading={<div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Ayarlar</div>}>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/settings'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <Settings className="mr-3 h-4 w-4 text-slate-400" />
                            <span>Sistem Ayarları</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/admin/users'))}
                            className="group relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm text-slate-300 outline-none hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-white data-[selected]:bg-slate-800 data-[selected]:text-white transition-colors"
                        >
                            <Smile className="mr-3 h-4 w-4 text-slate-400" />
                            <span>Kullanıcı Yönetimi</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    )
}
