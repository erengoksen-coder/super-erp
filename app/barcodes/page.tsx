'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Package, 
  Search, 
  Printer, 
  Download, 
  Eye, 
  EyeOff, 
  QrCode, 
  X, 
  Trash2, 
  Barcode as BarcodeIcon,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  History,
  LayoutGrid,
  Activity,
  Box,
  Monitor
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getAuthHeaders } from '@/lib/api/client'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { isDepodaStatus } from '@/lib/barcodeStatus'
import { usePolling } from '@/lib/hooks/usePolling'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

interface Barcode {
  id: string
  barcode: string
  serial_number: string
  product_id: string
  product_name: string
  sku: string
  status: string
  production_order_number?: string
  production_order_created_at?: string
  current_station?: string | null
  production_order_status?: string | null
  dealer_name?: string | null
  customer_name?: string | null
  customer_order_number?: string | null
  created_at: string
}

function BarcodeVisual({ barcode }: { barcode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showVisual, setShowVisual] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (showVisual && canvasRef.current && typeof window !== 'undefined') {
      const canvas = canvasRef.current
      const barcodeValue = barcode.replace(/[^0-9]/g, '') || barcode
      
      import('jsbarcode').then((JsBarcodeModule) => {
        const JsBarcode = JsBarcodeModule.default || JsBarcodeModule
        const options = {
          width: 1.5,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center' as const,
          textPosition: 'bottom' as const,
          textMargin: 4,
        }

        if (barcodeValue.length === 13) {
          JsBarcode(canvas, barcodeValue, { ...options, format: 'EAN13' })
        } else {
          JsBarcode(canvas, barcodeValue, { ...options, format: 'CODE128' })
        }
      })
    }
  }, [showVisual, barcode])

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(barcode)}`

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-mono font-black text-primary drop-shadow-sm tracking-tighter">
        {barcode}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowVisual(!showVisual)}
          className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all", showVisual ? "text-primary" : "text-foreground/20 hover:text-foreground/40")}
        >
          {showVisual ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          VAR
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all text-secondary", showQR ? "opacity-100" : "opacity-30 hover:opacity-60")}
        >
          {showQR ? <EyeOff className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
          QR
        </button>
      </div>
      {(showVisual || showQR) && (
        <div className="absolute z-10 mt-2 p-4 glass rounded-[1.5rem] border border-white/10 shadow-glow shadow-white/5 animate-reveal bg-white">
           <div className="flex justify-end mb-2">
              <button onClick={() => { setShowVisual(false); setShowQR(false); }} className="text-foreground/20 hover:text-error"><X className="w-4 h-4" /></button>
           </div>
           {showVisual && <canvas ref={canvasRef} className="max-w-full h-auto" />}
           {showQR && <img src={qrCodeUrl} alt="QR" className="w-32 h-32 mx-auto rounded-xl" />}
        </div>
      )}
    </div>
  )
}

export default function BarcodesPage() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('in_system')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedBarcodeData, setScannedBarcodeData] = useState<Barcode | null>(null)
  const qrScannerRef = useRef<any>(null)
  const qrReaderId = 'barcode-qr-reader'
  const [confirmDeleteNoOrder, setConfirmDeleteNoOrder] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  function printBarcode(barcode: Barcode) {
    window.open(`/inventory/products/print-barcode-label?barcodeId=${barcode.barcode}`, '_blank')
  }

  useEffect(() => { loadBarcodes() }, [filterStatus])
  usePolling(loadBarcodes)

  useEffect(() => {
    if (showQRScanner && typeof window !== 'undefined') {
      import('html5-qrcode').then((Html5QrcodeModule) => {
        const Html5QrcodeScanner = Html5QrcodeModule.Html5QrcodeScanner || (Html5QrcodeModule as any).default?.Html5QrcodeScanner
        const container = document.getElementById(qrReaderId)
        if (!container || !Html5QrcodeScanner) return

        const html5QrcodeScanner = new Html5QrcodeScanner(qrReaderId, { qrbox: { width: 250, height: 250 }, fps: 10, aspectRatio: 1.0 }, false)
        html5QrcodeScanner.render(async (decodedText: string) => {
          try {
            let barcodeNumber = decodedText
            try { barcodeNumber = JSON.parse(decodedText).barcode || decodedText } catch (e) {}
            const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(barcodeNumber)}`)
            if (!response.ok) throw new Error('Barkod bulunamadı')
            const data = await response.json()
            if (data && data.length > 0) {
              setScannedBarcodeData(data[0])
              setShowQRScanner(false)
              html5QrcodeScanner.clear()
            } else {
              toast.warning('Sistemde bu barkod kaydına ulaşılamadı')
            }
          } catch (e: any) {
            toast.error('Okuma hatası: ' + e.message)
          }
        }, () => {})
        qrScannerRef.current = html5QrcodeScanner
        return () => { if (qrScannerRef.current) qrScannerRef.current.clear() }
      })
    }
  }, [showQRScanner])

  async function loadBarcodes() {
    try {
      const url = filterStatus === 'all' ? '/api/barcodes' : 
                  filterStatus === 'in_system' ? '/api/barcodes?in_system=1' : 
                  `/api/barcodes?status=${filterStatus}`
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' })
      if (!response.ok) throw new Error('Barkodlar senkronize edilemedi')
      const data = await response.json()
      setBarcodes(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  function getStatusBadge(barcode: Barcode) {
    if (barcode.production_order_status && barcode.production_order_status !== 'completed' && barcode.current_station) {
      return <Badge variant="soft" color="warning" className="text-[8px] font-black px-3 tracking-widest">{barcode.current_station.toUpperCase()} AŞAMASINDA</Badge>
    }
    const colorMap: any = { in_stock: 'success', available: 'success', in_production: 'warning', sold: 'primary', reserved: 'secondary', shipped: 'secondary' }
    const labelMap: any = { in_stock: 'MAMÜL DEPODA', available: 'MAMÜL DEPODA', in_production: 'ÜRETİMDE', sold: 'SATILDI', reserved: 'REZERVE', shipped: 'SEVK EDİLDİ' }
    return <Badge variant="soft" color={colorMap[barcode.status] || 'secondary'} className="text-[8px] font-black px-3 tracking-widest">{labelMap[barcode.status] || barcode.status.toUpperCase()}</Badge>
  }

  const filteredBarcodes = barcodes.filter((b) => {
    const s = searchTerm.toLowerCase()
    return b.barcode.toLowerCase().includes(s) || b.serial_number.toLowerCase().includes(s) || b.product_name.toLowerCase().includes(s)
  })

  return (
    <AppDashboardLayout
      title="Barkod & Seri No Yönetimi"
      subtitle="Üretimden sevkiyata tüm ürünlerin anlık izlenebilirliği"
      icon={BarcodeIcon}
      actions={
         <div className="flex items-center gap-3">
            <Button onClick={() => setShowQRScanner(true)} color="primary" className="rounded-xl shadow-glow shadow-primary/20"><QrCode className="w-4 h-4 mr-2" /> QR OKUT</Button>
            <Button variant="ghost" size="icon" onClick={loadBarcodes}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
         </div>
      }
    >
      <div className="space-y-8 animate-reveal">
         <ConfirmDialog isOpen={confirmDeleteNoOrder} onClose={() => setConfirmDeleteNoOrder(false)} onConfirm={async () => {
            const res = await fetch('/api/barcodes?no_production_order=1', { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
            loadBarcodes(); toast.success('Kayıtlar temizlendi');
         }} title="Geçersiz Barkodları Temizle" message="Üretim emri bulunmayan tüm barkodlar sistemden silinecektir." variant="warning" />
         
         <ConfirmDialog isOpen={confirmDeleteAll} onClose={() => setConfirmDeleteAll(false)} onConfirm={async () => {
            const res = await fetch('/api/barcodes?all=1', { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
            loadBarcodes(); toast.success('Tüm barkodlar silindi');
         }} title="SIFIRLAMA İŞLEMİ" message="Sistemdeki tüm barkod kayıtları kalıcı olarak silinecektir!" variant="danger" />

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
           {[
              { label: 'TOPLAM BARKOD', value: barcodes.length, icon: Box, color: 'primary' },
              { label: 'DEPODA (MAMÜL)', value: barcodes.filter(b => isDepodaStatus(b.status)).length, icon: CheckCircle2, color: 'success' },
              { label: 'ÜRETİM HATTINDA', value: barcodes.filter(b => b.status === 'in_production').length, icon: Activity, color: 'warning' },
              { label: 'SATIŞ / REZERVE', value: barcodes.filter(b => ['sold','reserved'].includes(b.status)).length, icon: Zap, color: 'secondary' },
              { label: 'SEVKİYAT', value: barcodes.filter(b => b.status === 'shipped').length, icon: Printer, color: 'secondary' }
           ].map((s, i) => (
              <Card key={i} variant="glass" className="border-white/5 overflow-hidden">
                 <CardBody className="p-6 relative">
                    <div className={cn("absolute -top-4 -right-4 p-6 opacity-5", `text-${s.color}`)}><s.icon className="w-16 h-16" /></div>
                    <p className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter">{s.value}</h3>
                 </CardBody>
              </Card>
           ))}
        </div>

        {/* Filters Toolbar */}
        <Card variant="glass" className="border-white/5">
           <CardBody className="p-4 flex flex-col md:flex-row items-center gap-6">
              <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                 <Input 
                    variant="filled" 
                    placeholder="Seri no, barkod veya ürün adı ile filtrele..." 
                    className="pl-11 h-12 text-xs font-bold uppercase" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <select
                    className="h-12 px-6 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                 >
                    <option value="in_system">SİSTEMDEKİLER</option>
                    <option value="all">FİLTRE: TÜMÜ</option>
                    <option value="in_stock">DEPOLANANLAR</option>
                    <option value="in_production">ÜRETİMDEKİLER</option>
                    <option value="sold">SATILANLAR</option>
                    <option value="reserved">REZERVELER</option>
                    <option value="shipped">SEVKİYATLAR</option>
                 </select>

                 <div className="flex items-center gap-2">
                    <Button variant="ghost" color="warning" size="sm" onClick={() => setConfirmDeleteNoOrder(true)} className="h-12 px-4 rounded-xl text-[10px] uppercase font-black tracking-tighter"><Trash2 className="w-4 h-4 mr-2" /> GEÇERSİZLERİ TEMİZLE</Button>
                    <Button variant="ghost" color="error" size="sm" onClick={() => setConfirmDeleteAll(true)} className="h-12 px-4 rounded-xl text-[10px] uppercase font-black tracking-tighter hover:bg-error/10"><Trash2 className="w-4 h-4" /></Button>
                 </div>
              </div>
           </CardBody>
        </Card>

        {/* Main Table */}
        <Card variant="glass" className="border-white/5 overflow-hidden">
           <CardBody className="p-0">
              <div className="overflow-x-auto">
                 <table className="w-full">
                    <thead>
                       <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                          <th className="p-6 text-left">Görsel / Barkod</th>
                          <th className="p-6 text-left">Ürün Detayı</th>
                          <th className="p-6 text-center">Durum</th>
                          <th className="p-6 text-left">Üretim / Bayi</th>
                          <th className="p-6 text-left">Kayıt Tarihi</th>
                          <th className="p-6 text-right">İşlem</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {loading ? (
                          <tr><td colSpan={6} className="py-24 text-center animate-pulse opacity-40 font-black uppercase text-xs">Barkod Veritabanı Taranıyor...</td></tr>
                       ) : filteredBarcodes.length === 0 ? (
                          <tr><td colSpan={6} className="py-24 text-center opacity-20 font-black uppercase text-xs">Barkod kaydı bulunamadı.</td></tr>
                       ) : (
                          filteredBarcodes.map((b) => (
                             <tr key={b.id} className="hover:bg-white/[0.02] group transition-colors">
                                <td className="p-6 min-w-[200px] relative">
                                   <BarcodeVisual barcode={b.barcode} />
                                </td>
                                <td className="p-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Package className="w-5 h-5" /></div>
                                      <div className="flex flex-col">
                                         <span className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">{b.product_name}</span>
                                         <span className="text-[10px] font-bold opacity-30 uppercase tracking-tighter italic">SKU: {b.sku} | SERİ: {b.serial_number}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="p-6 text-center">
                                   {getStatusBadge(b)}
                                </td>
                                <td className="p-6">
                                   <div className="flex flex-col gap-1">
                                      <span className="text-xs font-black text-white opacity-60 uppercase tracking-tight italic flex items-center gap-2">
                                         <Monitor className="w-3 h-3 text-secondary" /> {b.production_order_number || 'EMİR YOK'}
                                      </span>
                                      <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-tighter">BAYİ: {b.dealer_name || 'GENEL STOK'}</span>
                                   </div>
                                </td>
                                <td className="p-6">
                                   <div className="flex flex-col text-[10px] font-black uppercase tracking-tight">
                                      <span className="text-foreground/40">{formatDate(b.created_at)}</span>
                                      <span className="text-[8px] opacity-20 font-mono tracking-widest">{b.created_at.split('T')[1].substring(0, 5)}</span>
                                   </div>
                                </td>
                                <td className="p-6 text-right">
                                   <Button variant="ghost" size="icon" onClick={() => window.open(`/inventory/products/print-barcode-label?barcodeId=${b.barcode}`, '_blank')} className="rounded-xl hover:bg-primary/10 hover:text-primary"><Printer className="w-4 h-4" /></Button>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </CardBody>
        </Card>

        {/* QR Scanner Modal Platinum Overlay */}
        {showQRScanner && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#09090b]/90 backdrop-blur-xl animate-reveal">
              <Card variant="glass" className="w-full max-w-lg border-white/10 shadow-glow-lg overflow-hidden">
                 <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <QrCode className="w-6 h-6 text-primary shadow-glow shadow-primary/40" />
                       <h3 className="text-xl font-black uppercase tracking-tight">SİSTEM TARAYICISI</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowQRScanner(false)} className="rounded-xl"><X className="w-5 h-5" /></Button>
                 </CardHeader>
                 <CardBody className="p-8 space-y-6">
                    <div id={qrReaderId} className="w-full aspect-square bg-[#0c0c0e] rounded-[3rem] border-2 border-primary/20 overflow-hidden shadow-inner relative group">
                       <div className="absolute inset-0 pointer-events-none border-[40px] border-[#0c0c0e]/60" />
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/40 rounded-3xl animate-pulse" />
                    </div>
                    <p className="text-center text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] italic">ÜRÜN BARKODUNU VEYA QR KODUNU MERKEZE GETİRİN</p>
                 </CardBody>
              </Card>
           </div>
        )}

        {/* Scanned Detail Modal Platinum Overlay */}
        {scannedBarcodeData && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#09090b]/90 backdrop-blur-xl animate-reveal">
              <Card variant="glass" className="w-full max-w-3xl border-white/10 shadow-glow-lg overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Zap className="w-64 h-64 text-primary" /></div>
                 <CardHeader className="p-10 border-b border-white/10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary border border-primary/20"><Monitor className="w-8 h-8 shadow-glow" /></div>
                          <div>
                             <h3 className="text-2xl font-black uppercase tracking-tight">Barkod Analizi</h3>
                             <p className="text-[10px] font-bold text-foreground/40 mt-1 uppercase tracking-widest italic leading-relaxed">SİSTEM SİCİL VE TAKİP VERİSİ</p>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => setScannedBarcodeData(null)} className="h-12 w-12 rounded-2xl bg-white/5"><X className="w-6 h-6" /></Button>
                    </div>
                 </CardHeader>
                 <CardBody className="p-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Sistem Barkodu</p>
                          <p className="text-xl font-mono font-black text-white italic">{scannedBarcodeData.barcode}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Seri Numarası</p>
                          <p className="text-xl font-mono font-black text-white italic">{scannedBarcodeData.serial_number}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">İzleme Durumu</p>
                          <div className="pt-1">{getStatusBadge(scannedBarcodeData)}</div>
                       </div>
                       <div className="col-span-full h-px bg-white/10 my-4" />
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Ürün Tanımı</p>
                          <p className="text-sm font-black text-white uppercase italic">{scannedBarcodeData.product_name}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">SKU / Model</p>
                          <p className="text-sm font-black text-white italic">{scannedBarcodeData.sku}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Üretim Emri</p>
                          <p className="text-sm font-black text-secondary italic">{scannedBarcodeData.production_order_number || '-'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Cari / Bayi</p>
                          <p className="text-sm font-black text-white uppercase italic">{scannedBarcodeData.dealer_name || 'GENEL STOK'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Müşteri</p>
                          <p className="text-sm font-black text-white uppercase italic">{scannedBarcodeData.customer_name || '-'}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">Sipariş No</p>
                          <p className="text-sm font-black text-white italic">{scannedBarcodeData.customer_order_number || '-'}</p>
                       </div>
                    </div>
                    <div className="mt-12 flex justify-end gap-4">
                       <Button variant="ghost" onClick={() => setScannedBarcodeData(null)} className="px-8 rounded-xl text-[10px] font-black uppercase tracking-widest italic">PENCEREYİ KAPAT</Button>
                       <Button color="primary" onClick={() => printBarcode(scannedBarcodeData)} className="px-8 rounded-xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20"><Printer className="w-4 h-4 mr-2" /> ETİKET YAZDIR</Button>
                    </div>
                 </CardBody>
              </Card>
           </div>
        )}
      </div>
    </AppDashboardLayout>
  )
}
