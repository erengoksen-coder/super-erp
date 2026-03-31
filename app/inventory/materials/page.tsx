'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Package, AlertTriangle, ArrowDown, ArrowUp, 
  Filter, Edit, Trash2, RefreshCw, Download, 
  Search, History, MoreHorizontal, CheckCircle2,
  Layers, Activity, TrendingUp, ChevronRight,
  FileText, Info, Barcode, X
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'

interface Material {
  id: string
  code: string
  name: string
  unit: string
  stock_amount: number
  total_in: number
  total_out: number
  min_stock_level: number
  category: string | null
  unit_price: number
}

export default function MaterialsInventoryPage() {
  const router = useRouter()
  const { data: materials = [], isLoading, mutate } = useApi<Material[]>('/api/materials')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [filterCritical, setFilterCritical] = useState(false)
  const [activeForm, setActiveForm] = useState<'none' | 'in' | 'out'>('none')
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [quantity, setQuantity] = useState<number>(0)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const filteredMaterials = useMemo(() => materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Tümü' || m.category === selectedCategory
    const matchesCritical = !filterCritical || m.stock_amount <= m.min_stock_level
    return matchesSearch && matchesCategory && matchesCritical
  }), [materials, searchTerm, selectedCategory, filterCritical])

  const categories = useMemo(() => ['Tümü', ...Array.from(new Set(materials.map(m => m.category).filter(Boolean))) as string[]], [materials])

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      await fetchApi('/api/materials/recalculate-stock', { method: 'POST' })
      toast.success('Stoklar başarıyla güncellendi.')
      mutate()
    } catch (e: any) { toast.error(e.message) }
    finally { setIsRecalculating(false) }
  }

  const handleStockAction = async () => {
    if (!selectedMaterialId || quantity <= 0) return toast.warning('Geçerli veri girin.')
    const endpoint = activeForm === 'in' ? '/api/materials/stock-in' : '/api/materials/stock-out'
    try {
      await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify({ material_id: selectedMaterialId, quantity, invoice_number: invoiceNumber, notes })
      })
      toast.success('İşlem kaydedildi.')
      mutate()
      resetForm()
    } catch (e: any) { toast.error(e.message) }
  }

  const resetForm = () => {
    setActiveForm('none')
    setQuantity(0)
    setInvoiceNumber('')
    setNotes('')
    setSelectedMaterialId('')
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await fetchApi(`/api/materials/${deleteConfirm.id}`, { method: 'DELETE' })
      toast.success('Silindi.')
      setDeleteConfirm(null)
      mutate()
    } catch (e: any) { toast.error(e.message) }
  }

  const criticalOrders = materials.filter(m => m.stock_amount <= m.min_stock_level)

  return (
    <AppDashboardLayout
      title="Hammadde Envanteri"
      subtitle="Malzeme stok takibi ve depo hareketleri"
      icon={Package}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="glass" size="sm" onClick={handleRecalculate} disabled={isRecalculating}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isRecalculating && "animate-spin")} />
              Senkronize Et
           </Button>
           <Link href="/inventory/materials/new">
              <Button variant="solid" color="primary" size="sm">
                 <Plus className="w-4 h-4 mr-2" />
                 Yeni Malzeme
              </Button>
           </Link>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Toplam Kalem', val: materials.length, icon: Layers, color: 'text-primary' },
              { label: 'Kritik Seviye', val: criticalOrders.length, icon: AlertTriangle, color: 'text-error' },
              { label: 'Stok Girişleri', val: materials.reduce((s, m) => s + m.total_in, 0), icon: ArrowDown, color: 'text-success' },
              { label: 'Stok Çıkışları', val: materials.reduce((s, m) => s + m.total_out, 0), icon: ArrowUp, color: 'text-warning' }
            ].map((stat, i) => (
              <Card key={i} variant="glass" className="hover:scale-[1.02] transition-transform">
                 <CardBody className="p-6 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{stat.label}</p>
                       <p className="text-3xl font-black">{stat.val}</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                       <stat.icon className="w-6 h-6" />
                    </div>
                 </CardBody>
              </Card>
            ))}
         </div>

         {/* Action Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              variant="glass" 
              className={cn("cursor-pointer border-2 transition-all group overflow-hidden", activeForm === 'in' ? "border-success bg-success/5 shadow-glow shadow-success/10" : "border-white/5 hover:border-success/30")}
              onClick={() => setActiveForm(activeForm === 'in' ? 'none' : 'in')}
            >
               <CardBody className="p-6 flex items-center gap-6">
                  <div className="p-4 bg-success/10 rounded-2xl group-hover:scale-110 transition-transform">
                     <ArrowDown className="w-8 h-8 text-success shadow-glow" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black uppercase">Stok Girişi Yap</h3>
                     <p className="text-xs font-medium text-foreground/40 mt-1 uppercase tracking-widest">Mal kabul, irsaliye girişi</p>
                  </div>
                  {activeForm === 'in' && <CheckCircle2 className="w-6 h-6 text-success ml-auto animate-pulse" />}
               </CardBody>
            </Card>

            <Card 
              variant="glass" 
              className={cn("cursor-pointer border-2 transition-all group overflow-hidden", activeForm === 'out' ? "border-warning bg-warning/5 shadow-glow shadow-warning/10" : "border-white/5 hover:border-warning/30")}
              onClick={() => setActiveForm(activeForm === 'out' ? 'none' : 'out')}
            >
               <CardBody className="p-6 flex items-center gap-6">
                  <div className="p-4 bg-warning/10 rounded-2xl group-hover:scale-110 transition-transform">
                     <ArrowUp className="w-8 h-8 text-warning shadow-glow" />
                  </div>
                  <div>
                     <h3 className="text-xl font-black uppercase">Stok Çıkışı Yap</h3>
                     <p className="text-xs font-medium text-foreground/40 mt-1 uppercase tracking-widest">Sarfiyat, üretim kullanımı</p>
                  </div>
                  {activeForm === 'out' && <CheckCircle2 className="w-6 h-6 text-warning ml-auto animate-pulse" />}
               </CardBody>
            </Card>
         </div>

         {/* Stock Form */}
         {activeForm !== 'none' && (
            <Card variant="glass" className="bg-primary/5 border-primary/20 animate-reveal">
               <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 font-black uppercase tracking-widest text-sm text-primary">
                     {activeForm === 'in' ? <ArrowDown className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
                     {activeForm === 'in' ? 'Malzeme Kabul Formu' : 'Stok Sarfiyat Formu'}
                  </div>
                  <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-5 h-5 opacity-40" /></Button>
               </CardHeader>
               <CardBody className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Malzeme Seçimi</label>
                     <select 
                        value={selectedMaterialId}
                        onChange={(e) => setSelectedMaterialId(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                     >
                        <option value="">LÜTFEN SEÇİN...</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Miktar</label>
                     <Input type="number" variant="filled" placeholder="0" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Belge / Fatura No</label>
                     <Input variant="filled" placeholder="İsteğe bağlı" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                     <Button className="w-full h-11" color={activeForm === 'in' ? 'success' : 'warning'} onClick={handleStockAction}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Kaydı Tamamla
                     </Button>
                  </div>
               </CardBody>
            </Card>
         )}

         {/* Filters & Search */}
         <Card variant="glass">
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Kod veya Malzeme Ara..." 
                    className="pl-12 w-full" 
                    variant="filled"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                  >
                     {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                  </select>
                  <Button 
                    variant={filterCritical ? 'solid' : 'glass'} 
                    color="error" 
                    size="sm"
                    onClick={() => setFilterCritical(!filterCritical)}
                  >
                     <AlertTriangle className={cn("w-4 h-4 mr-2", filterCritical && "animate-pulse")} />
                     Kritik Stok
                  </Button>
               </div>
            </CardBody>
         </Card>

         {/* Table Content */}
         <div className="space-y-4">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                  <div className="text-center opacity-40 font-black uppercase tracking-widest text-lg">Envanter Yükleniyor...</div>
               </div>
            ) : filteredMaterials.length === 0 ? (
               <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest">Eşleşen kayıt bulunamadı</div>
            ) : (
               filteredMaterials.map((material) => (
                  <Card key={material.id} variant="glass" className="hover:bg-white/[0.02] transition-all group overflow-hidden">
                     <CardBody className="p-0">
                        <div className="flex flex-col md:flex-row items-center p-4 gap-6 relative">
                           <div className={cn("w-1.5 h-12 rounded-full absolute left-0", material.stock_amount <= material.min_stock_level ? "bg-error shadow-glow shadow-error/50" : "bg-success")} />
                           
                           <div className="flex-1 min-w-0 ml-4">
                              <div className="flex items-center gap-3 mb-1">
                                 <p className="text-xs font-black text-primary font-mono uppercase tracking-widest">{material.code}</p>
                                 <Badge variant="soft" className="text-[8px] opacity-40">{material.category?.toUpperCase() || 'GENEL'}</Badge>
                                 {material.stock_amount <= material.min_stock_level && (
                                    <Badge color="error" variant="soft" className="text-[8px] animate-pulse">KRİTİK SEVİYE</Badge>
                                 )}
                              </div>
                              <h4 className="font-black text-xl uppercase tracking-tighter group-hover:text-primary transition-colors">{material.name}</h4>
                              <div className="flex items-center gap-6 mt-1.5">
                                 <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest leading-none">Mevcut Stok</span>
                                    <span className={cn("text-lg font-black", material.stock_amount <= material.min_stock_level ? "text-error" : "text-foreground")}>{material.stock_amount} <span className="text-xs font-medium opacity-30">{material.unit}</span></span>
                                 </div>
                                 <div className="flex flex-col border-l border-white/5 pl-6">
                                    <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest leading-none">Ort. Fiyat</span>
                                    <span className="text-lg font-black text-foreground opacity-60">₺{material.unit_price?.toLocaleString() || '0'}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-4 pr-2">
                              <div className="flex items-center gap-2">
                                 <Button variant="glass" size="icon" className="h-10 w-10 text-success hover:bg-success hover:text-white" onClick={() => { setSelectedMaterialId(material.id); setActiveForm('in'); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
                                    <ArrowDown className="w-4 h-4" />
                                 </Button>
                                 <Button variant="glass" size="icon" className="h-10 w-10 text-warning hover:bg-warning hover:text-white" onClick={() => { setSelectedMaterialId(material.id); setActiveForm('out'); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
                                    <ArrowUp className="w-4 h-4" />
                                 </Button>
                                 <Button variant="glass" size="icon" className="h-10 w-10 opacity-30 hover:opacity-100 hover:bg-white/5" onClick={() => router.push(`/inventory/materials/${material.id}`)}>
                                    <Edit className="w-4 h-4" />
                                 </Button>
                                 <Button variant="glass" size="icon" className="h-10 w-10 text-error/30 hover:bg-error hover:text-white" onClick={() => setDeleteConfirm({ id: material.id, name: material.name })}>
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              </div>
                              <Button variant="glass" size="icon" className="group-hover:bg-primary group-hover:text-white transition-all ml-2" onClick={() => router.push(`/inventory/materials/${material.id}`)}>
                                 <ChevronRight className="w-5 h-5" />
                              </Button>
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               ))
            )}
         </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Malzemeyi Sil"
        message={`"${deleteConfirm?.name}" malzemesini silmek istediğinize emin misiniz?`}
        variant="danger"
      />
    </AppDashboardLayout>
  )
}
