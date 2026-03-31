'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, Edit, Trash2, Factory, Package, 
  History, Search, Save, X, Layers,
  AlertCircle, CheckCircle2, RefreshCw, Calculator,
  Activity, TrendingUp, ChevronRight, MoreHorizontal,
  Workflow, Boxes, Zap, FileText, Info
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useApi } from '@/lib/api/client'
import { fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/cn'

interface Material {
  id: string
  code: string | null
  name: string
  unit: string
  unit_price: number | null
}

interface BOMVersion {
  id: string
  product_id: string
  product_name: string
  product_code: string
  version_no: number
  is_active: number
  item_count: number
}

export default function BOMPage() {
  const { data: boms = [], isLoading: loadingBoms, mutate: mutateBoms } = useApi<BOMVersion[]>('/api/production/bom')
  const { data: materials = [], isLoading: loadingMaterials } = useApi<Material[]>('/api/materials')

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBomId, setEditingBomId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [productName, setProductName] = useState('')
  const [productCode, setProductCode] = useState('')
  const [bomItems, setBomItems] = useState<Array<{ material_id: string; quantity: number; wastage_percentage: number }>>([
    { material_id: '', quantity: 1, wastage_percentage: 0 }
  ])

  const filteredBoms = useMemo(() => boms.filter(bom => 
    bom.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [boms, searchTerm])

  const addItemRow = () => {
    setBomItems([...bomItems, { material_id: '', quantity: 1, wastage_percentage: 0 }])
  }

  const removeItemRow = (index: number) => {
    if (bomItems.length > 1) {
      setBomItems(bomItems.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...bomItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setBomItems(newItems)
  }

  const handleSave = async () => {
    if (!productName || !productCode || bomItems.some(i => !i.material_id)) {
      toast.warning('Eksik alanları doldurunuz.')
      return
    }

    try {
      await fetchApi('/api/production/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: productName, product_code: productCode, items: bomItems })
      })
      toast.success('Reçete kaydedildi.')
      setIsFormOpen(false)
      resetForm()
      mutateBoms()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const resetForm = () => {
    setProductName('')
    setProductCode('')
    setBomItems([{ material_id: '', quantity: 1, wastage_percentage: 0 }])
    setEditingBomId(null)
  }

  const totalEstimatedCost = useMemo(() => {
    return bomItems.reduce((total, item) => {
      const material = materials.find(m => m.id === item.material_id)
      const cost = (material?.unit_price || 0) * item.quantity * (1 + (item.wastage_percentage / 100))
      return total + cost
    }, 0)
  }, [bomItems, materials])

  return (
    <AppDashboardLayout
      title="Ürün Reçeteleri (BOM)"
      subtitle="Mamül üretim ağaçları ve içerik yönetimi"
      icon={Workflow}
      actions={
        <Button variant="solid" color="primary" onClick={() => setIsFormOpen(true)} className="shadow-lg shadow-primary/25">
          <Plus className="w-4 h-4 mr-2" /> Yeni Reçete
        </Button>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* BOM Overview Stats */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Reçete</p>
                     <p className="text-3xl font-black">{boms.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                     <Layers className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Aktif Üretimler</p>
                     <p className="text-3xl font-black text-success">{boms.filter(b => b.is_active).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-success/10 text-success">
                     <Zap className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Ort. Kalem/Reçete</p>
                     <p className="text-3xl font-black text-white">4.2</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-foreground/40">
                     <Boxes className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Bekleyen Revizyon</p>
                     <p className="text-3xl font-black text-warning">0</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-warning/10 text-warning">
                     <RefreshCw className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
         </div>

         {/* Search Bar */}
         <Card variant="glass">
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Mamül Adı veya Kodu İle Ara..." 
                    className="pl-12 w-full" 
                    variant="filled"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <Button variant="ghost" size="sm" onClick={() => mutateBoms()}>
                  <RefreshCw className={cn("w-4 h-4 mr-2", loadingBoms && "animate-spin")} />
                  Yenile
               </Button>
            </CardBody>
         </Card>

         {/* BOM List Table */}
         <Card variant="glass" className="overflow-hidden border-white/5">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="bg-white/5 border-b border-white/5">
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Mamül Kodu</th>
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Mamül Adı</th>
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Versiyon</th>
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Bileşen Sayısı</th>
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-center">Durum</th>
                        <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">İşlemler</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {loadingBoms ? (
                        <tr><td colSpan={6} className="py-20 text-center opacity-40 font-black uppercase tracking-widest text-xs">Yükleniyor...</td></tr>
                     ) : filteredBoms.length === 0 ? (
                        <tr><td colSpan={6} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Reçete kaydı bulunamadı</td></tr>
                     ) : (
                        filteredBoms.map((bom) => (
                           <tr key={bom.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-4 font-mono text-primary font-bold text-sm tracking-tighter">{bom.product_code}</td>
                              <td className="p-4 font-black uppercase text-sm tracking-tight text-foreground/80">{bom.product_name}</td>
                              <td className="p-4">
                              <Badge variant="soft" className="text-[8px] font-black px-3">REV {bom.version_no}</Badge>
                              </td>
                              <td className="p-4">
                                 <span className="text-xs font-bold text-foreground/40">{bom.item_count} KALEM</span>
                              </td>
                              <td className="p-4 text-center">
                                 <Badge variant="soft" color={bom.is_active ? "success" : "secondary"} className="text-[8px] font-black px-3">
                                    {bom.is_active ? "AKTİF" : "ARŞİV"}
                                 </Badge>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all"
                                      title="Düzenle"
                                      onClick={() => {
                                        setEditingBomId(bom.id);
                                        setProductName(bom.product_name);
                                        setProductCode(bom.product_code);
                                        setIsFormOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl text-red-500 hover:bg-error/10 transition-all"
                                      title="Sil"
                                      onClick={() => setDeleteConfirm(bom.id)}
                                    >
                                      <Trash2 className="w-4 h-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all"
                                      title="Detaylar"
                                      onClick={() => toast.info(`${bom.product_name} detay sayfasına yönlendiriliyorsunuz...`)}
                                    >
                                      <ChevronRight className="w-5 h-5 shadow-glow" />
                                    </Button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </Card>
      </div>

      {/* Modernized Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Yeni Üretim Reçetesi (BOM)"
        size="xl"
      >
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mamül Adı *</label>
                 <Input variant="filled" placeholder="Örn: Chester Koltuk" value={productName} onChange={e => setProductName(e.target.value)} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mamül Kodu (SKU) *</label>
                 <Input variant="filled" placeholder="SKU-CH-001" value={productCode} onChange={e => setProductCode(e.target.value)} />
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Hammadde Bileşenleri</h3>
                 <Badge variant="soft" color="success" className="font-black text-[9px]">
                    TAHMİNİ MALİYET: ₺{totalEstimatedCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                 </Badge>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {bomItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                       <div className="md:col-span-5 space-y-2">
                          <label className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">Malzeme</label>
                          <select 
                             value={item.material_id}
                             onChange={(e) => updateItem(index, 'material_id', e.target.value)}
                             className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                          >
                             <option value="">Seçiniz...</option>
                             {materials.map(m => (
                                <option key={m.id} value={m.id}>{m.code} - {m.name} ({m.unit})</option>
                             ))}
                          </select>
                       </div>
                       <div className="md:col-span-3 space-y-2">
                          <label className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">Miktar</label>
                          <Input variant="filled" type="number" className="h-10 text-xs" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} />
                       </div>
                       <div className="md:col-span-3 space-y-2">
                          <label className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">Fire %</label>
                          <Input variant="filled" type="number" className="h-10 text-xs" value={item.wastage_percentage} onChange={(e) => updateItem(index, 'wastage_percentage', Number(e.target.value))} />
                       </div>
                       <div className="md:col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon" className="text-error hover:bg-error/10" onClick={() => removeItemRow(index)}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                 ))}
              </div>

              <Button 
                variant="glass" 
                className="w-full border-dashed border-white/10 hover:border-primary/50 group h-12"
                onClick={addItemRow}
              >
                <Plus className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" /> Bileşen Ekle
              </Button>
           </div>

           <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-2x border border-primary/10 text-[10px] font-bold opacity-40 italic leading-relaxed">
              <Info className="w-4 h-4 shrink-0 text-primary" />
              Reçete kaydedildikten sonra tüm üretim emirlerinde bu standart bileşenler otomatik olarak kullanılacaktır.
           </div>

           <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)}>İptal</Button>
              <Button color="primary" onClick={handleSave} disabled={!productName || !productCode}>
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 Sisteme Kaydet
              </Button>
           </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {/* Delete logic */}}
        title="Reçeteyi Sil"
        message="Bu ürün reçetesini silmek istediğinize emin misiniz? Bu işlem üretim emirlerini etkileyebilir."
        variant="danger"
      />
    </AppDashboardLayout>
  )
}
