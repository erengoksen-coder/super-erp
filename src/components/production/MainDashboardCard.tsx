import React from 'react';
import { ArrowUp, Clock, Package, MapPin, Truck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * PROPS & TYPES
 */
interface StatRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface MainDashboardCardProps {
  title?: string;
  category?: string;
  supplyTime?: string;
  location?: string;
  stats?: {
    physical: number;
    reserved: number;
    available: number;
    requirement: number;
  };
  supplier?: {
    name: string;
    price: string;
    trend: 'up' | 'down';
  };
  lastAction?: string;
}

/**
 * REUSABLE COMPONENTS
 */
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 backdrop-blur-md text-white/40",
    className
  )}>
    {children}
  </div>
);

const Pill = ({ children, variant = 'blue', icon: Icon }: { children: React.ReactNode; variant?: 'blue' | 'orange'; icon?: any }) => (
  <div className={cn(
    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md transition-all duration-300",
    variant === 'orange' 
      ? "bg-[#FF8000]/10 border-[#FF8000]/20 text-[#FF8000] shadow-[0_0_15px_rgba(255,128,0,0.1)]"
      : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
  )}>
    {Icon && <Icon className="w-3 h-3" />}
    {children}
  </div>
);

const StatRow = ({ label, value, highlight }: StatRowProps) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-none group/row transition-all">
    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</span>
    <span className={cn(
      "text-sm font-black tracking-tight transition-all",
      highlight ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : "text-white group-hover/row:text-cyan-200"
    )}>
      {value}
    </span>
  </div>
);

const SupplierCard = ({ name, price, trend }: { name: string; price: string; trend: 'up' | 'down' }) => (
  <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group/supplier">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/supplier:opacity-100 transition-opacity" />
    <div>
      <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 block">ANA TEDARİKÇİ</span>
      <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">{name}</h4>
    </div>
    <div className="mt-4 flex items-end justify-between">
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">BİRİM FİYAT</span>
        <span className="text-lg font-black text-white leading-none mt-1">{price}</span>
      </div>
      <div className={cn(
        "flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-black",
        trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
      )}>
        {trend === 'up' && <ArrowUp className="w-3 h-3" />}
        <span className="leading-none tracking-tighter">%1.2</span>
      </div>
    </div>
  </div>
);

/**
 * MAIN COMPONENT
 */
export default function MainDashboardCard({
  title = "ALASKA 08",
  category = "KUMAŞ",
  supplyTime = "3 Gün",
  location = "A-21",
  stats = { physical: 200, reserved: 200, available: 1500, requirement: 0 },
  supplier = { name: "Liva Tekstil", price: "29,00", trend: "up" },
  lastAction = "2sa önce"
}: MainDashboardCardProps) {
  return (
    <div className="w-full max-w-4xl p-1">
      <div className={cn(
        "relative rounded-[32px] overflow-hidden transition-all duration-700",
        "bg-[#0b101d]/80 backdrop-blur-[40px] border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]",
        "group hover:border-cyan-500/30 hover:shadow-[0_0_50px_rgba(6,182,212,0.15)]"
      )}>
        {/* Neon Accent Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000" />
        
        {/* Main Header */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <Pill variant="orange" icon={Package}>{category}</Pill>
                <Pill variant="blue" icon={Truck}>Tedarik: {supplyTime}</Pill>
                <Pill variant="blue" icon={MapPin}>Konum: {location}</Pill>
              </div>
              
              <div className="flex flex-col">
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl flex items-center gap-3">
                  {title}
                  <ChevronRight className="w-8 h-8 text-cyan-500/30 group-hover:translate-x-2 transition-transform duration-500" />
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981] animate-pulse" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">AKTİF ENVANTER SİSTEMİ</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Son işlem: {lastAction}
              </Badge>
              <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em] mt-2">V8.2_PLATINUM_CORE</div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Left: Stats Table */}
            <div className="space-y-1">
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-white uppercase tracking-widest">STOK VERİLERİ</span>
                <span className="text-[9px] font-bold text-white/20 uppercase">CANLI GÜNCELLEME</span>
              </div>
              <StatRow label="Fiziksel Stok" value={stats.physical} />
              <StatRow label="Ayrılan" value={stats.reserved} />
              <StatRow label="Kullanılabilir" value={stats.available} highlight />
              <StatRow label="Üretim İhtiyacı" value={stats.requirement} />
            </div>

            {/* Right: Supplier & CTA */}
            <div className="flex flex-col justify-between gap-6">
              <SupplierCard 
                name={supplier.name} 
                price={supplier.price} 
                trend={supplier.trend} 
              />
              
              <button className={cn(
                "w-full h-14 rounded-2xl relative overflow-hidden transition-all duration-500",
                "bg-cyan-500 hover:bg-cyan-400 text-white font-black text-xs uppercase tracking-[0.3em]",
                "shadow-[0_20px_40px_-10px_rgba(6,182,212,0.4)] hover:shadow-[0_25px_50px_-5px_rgba(6,182,212,0.5)]",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000"
              )}>
                DETAYLI ANALİZİ GÖRÜNTÜLE
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-8 py-4 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex gap-4">
            <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">PID: 8092-AX</span>
            <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">MOD: PRODUCTION_READY</span>
          </div>
          <div className="text-[9px] font-black text-cyan-500/40 uppercase tracking-tighter">LIVASOFA SYSTEMS © 2026</div>
        </div>
      </div>
    </div>
  );
}
