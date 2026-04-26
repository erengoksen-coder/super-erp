'use client'

import MainDashboardCard from '@/components/production/MainDashboardCard'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function TestCardPage() {
  return (
    <main className={cn(
      "min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-12",
      "bg-[#020508] relative overflow-hidden",
      "before:fixed before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1)_0%,transparent_70%)]",
      "after:fixed after:inset-0 after:pointer-events-none after:bg-[linear-gradient(rgba(6,182,212,0.03)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(6,182,212,0.03)_1.5px,transparent_1.5px)] after:bg-[size:80px_80px] after:opacity-20"
    )}>
      <div className="max-w-4xl w-full space-y-12 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-pulse">
            <Zap className="w-8 h-8 text-cyan-500" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-[0.2em] uppercase italic">
            Platinum <span className="text-cyan-500">V8.2</span> Core
          </h1>
          <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Pixel-Perfect Component Rendering</p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <MainDashboardCard 
            title="ALASKA 08"
            category="KUMAŞ"
            supplyTime="3 Gün"
            location="A-21"
            stats={{
              physical: 200,
              reserved: 200,
              available: 1500,
              requirement: 0
            }}
            supplier={{
              name: "Liva Tekstil",
              price: "29,00",
              trend: "up"
            }}
            lastAction="2sa önce"
          />
        </div>

        <div className="flex justify-center">
            <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Ready for Production Deployment</span>
            </div>
        </div>
      </div>
    </main>
  )
}
