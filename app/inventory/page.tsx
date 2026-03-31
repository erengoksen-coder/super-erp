'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  Package, 
  Factory, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Plus,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Printer,
  Truck
} from 'lucide-react'
import { fetchApi, fetchAction, mutate } from '@/lib/api/client'
import { toast } from 'sonner'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { ExcelExportButton } from '@/components/ui/ExportButtons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import StockRealtime from '@/app/_components/stock-realtime'
import { AccessControl } from '@/components/auth/AccessControl'

// Barkod ve QR Kod Component
function BarcodeAndQRCode({ barcode, serialNumber, barcodeId, entryDate, onPrintLabel, onShip, onDelete, isAlreadyShipped }: { 
  barcode: string; 
  serialNumber: string; 
  barcodeId: string; 
  entryDate: string;
  onPrintLabel: () => void;
  onShip: () => void;
  onDelete?: () => void | Promise<void>;
  isAlreadyShipped?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [barcodeLoaded, setBarcodeLoaded] = useState(false)

  useEffect(() => {
    if (canvasRef.current && typeof window !== 'undefined' && !barcodeLoaded) {
      const canvas = canvasRef.current
      const barcodeValue = barcode.replace(/[^0-9]/g, '') || barcode
      
      import('jsbarcode').then((JsBarcodeModule) => {
        const JsBarcode = JsBarcodeModule.default || JsBarcodeModule
        
        canvas.width = 200
        canvas.height = 50
        
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        
        try {
          const options = {
            width: 1,
            height: 40,
            displayValue: true,
            fontSize: 10,
            margin: 5,
            background: '#ffffff',
            lineColor: '#000000',
            textAlign: 'center' as const,
            textPosition: 'bottom' as const,
            textMargin: 2,
          }

          if (barcodeValue.length === 13) {
            JsBarcode(canvas, barcodeValue, { ...options, format: 'EAN13' })
          } else {
            JsBarcode(canvas, barcodeValue, { ...options, format: 'CODE128' })
          }
          setBarcodeLoaded(true)
        } catch (error) {
          console.error('Barkod oluşturma hatası:', error)
        }
      }).catch((error) => {
        console.error('jsbarcode yükleme hatası:', error)
      })
    }
  }, [barcode, barcodeLoaded])

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(barcode)}`

  return (
    <div className="bg-white/5 rounded-xl border border-border/30 p-4 transition-all hover:border-primary/30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-1 w-full sm:w-auto">
          {/* Barkod Görseli */}
          <div className="space-y-1.5 shrink-0">
            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Barkod</p>
            <div className="bg-white p-2 rounded-lg border border-border/50">
              <canvas ref={canvasRef} className="max-w-[140px] h-auto" />
            </div>
          </div>
          {/* QR Kod */}
          <div className="space-y-1.5 shrink-0">
            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">QR Kod</p>
            <div className="bg-white p-2 rounded-lg border border-border/50">
              <img src={qrCodeUrl} alt="QR Code" className="w-12 h-12" />
            </div>
          </div>
          {/* Tarih Bilgisi */}
          <div className="hidden lg:block space-y-1.5">
            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest text-right">Giriş Tarihi</p>
            <p className="text-sm font-bold text-foreground/80 text-right">{entryDate || '-'}</p>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="md"
            onClick={onPrintLabel}
            className="flex-1 sm:flex-none h-11 px-4 border border-border/50 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
            title="Etiket Yazdır"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span className="text-xs font-bold uppercase tracking-wider">Yazdır</span>
          </Button>
          <Button
            variant={isAlreadyShipped ? 'ghost' : 'solid'}
            color={isAlreadyShipped ? 'secondary' : 'success'}
            size="md"
            onClick={isAlreadyShipped ? undefined : onShip}
            disabled={isAlreadyShipped}
            className={cn(
              "flex-1 sm:flex-none h-11 px-6 rounded-xl transition-all font-bold uppercase tracking-wider text-xs",
              !isAlreadyShipped && "shadow-lg shadow-emerald-500/20"
            )}
          >
            <Truck className="w-4 h-4 mr-2" />
            {isAlreadyShipped ? 'Sevk Edildi' : 'Sevk Et'}
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-11 w-11 rounded-xl text-foreground/40 hover:text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/10 flex items-center gap-6">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">ID:</span>
           <span className="text-xs font-mono text-primary/70">{barcode}</span>
        </div>
        {serialNumber && (
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Seri:</span>
             <span className="text-xs font-mono text-foreground/60">{serialNumber}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface MaterialItem {
  id: string
  name: string
  code?: string | null
  unit: string
  stock_amount: number
  min_stock_level: number
  max_stock_level?: number
  average_price?: number
  supplier_name?: string | null
  category?: string | null
  critical_stock: boolean
}

interface ProductItem {
  id: string
  name: string
  sku?: string | null
  stock_amount: number
  min_stock_level: number
  selling_price?: number
  cost_price?: number
  category?: string | null
  critical_stock: boolean
  unit: string
}

type InventoryType = 'materials' | 'products'
type ViewMode = 'grid' | 'list'

export function InventoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState<InventoryType>((searchParams.get('tab') as InventoryType) || 'products')
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [warehouseItems, setWarehouseItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedDealerTab, setSelectedDealerTab] = useState<string>('all')
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{ item: MaterialItem | ProductItem; type: InventoryType } | null>(null)
  const [confirmBulkShip, setConfirmBulkShip] = useState<{ items: any[]; dealerTab: string } | null>(null)
  const [confirmDeleteWarehouseBarcode, setConfirmDeleteWarehouseBarcode] = useState<string | null>(null)
  const [shipSuccessMessage, setShipSuccessMessage] = useState<string | null>(null)

  // URL state sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab) params.set('tab', activeTab)
    if (searchTerm) params.set('q', searchTerm)
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory)
    
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }, [activeTab, searchTerm, selectedCategory])

  const findOrCreateAccountByDealerName = useCallback(async (dealerName: string | null | undefined): Promise<string | null> => {
    if (!dealerName || dealerName.trim() === '') return null
    const trimmedName = dealerName.trim()
    const existingAccount = accounts.find(acc => acc.name && acc.name.trim().toLowerCase() === trimmedName.toLowerCase())
    if (existingAccount) return existingAccount.id
    try {
      const allAccounts = await fetchApi('/api/accounts?type=customer')
      const foundAccount = Array.isArray(allAccounts) 
        ? allAccounts.find((acc: any) => acc.name && acc.name.trim().toLowerCase() === trimmedName.toLowerCase())
        : null
      if (foundAccount) {
        setAccounts(prev => [...prev, foundAccount])
        return foundAccount.id
      }
      const newAccount = await fetchApi<{ id?: string; code?: string } | unknown>('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, type: 'customer' })
      })
      const acc = newAccount as { id?: string; code?: string } | null | undefined
      if (acc && acc.id) {
        setAccounts(prev => [...prev, { id: acc.id, code: acc.code ?? '', name: trimmedName, type: 'customer' }])
        return acc.id
      }
    } catch (error) {
      console.error('Account error:', error)
    }
    return null
  }, [accounts])

  const loadInventory = useCallback(async () => {
    try {
      const [materialsData, productsData, warehouseData, accountsData] = await Promise.all([
        fetchApi('/api/inventory/materials'),
        fetchApi('/api/inventory/products'),
        fetchApi('/api/inventory/products/warehouse').catch(() => []),
        fetchApi('/api/accounts?type=customer').catch(() => [])
      ])
      setMaterials(Array.isArray(materialsData) ? materialsData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setWarehouseItems(Array.isArray(warehouseData) ? warehouseData : [])
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const currentItems = activeTab === 'materials' ? materials : products
  const categories = Array.from(new Set(currentItems.map(item => item.category).filter(Boolean)))

  const filteredItems = currentItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item as any).code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item as any).sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const criticalCount = currentItems.filter(item => item.critical_stock).length
  const totalValue = currentItems.reduce((sum, item) => {
    const price = (item as any).average_price || (item as any).cost_price || 0
    return sum + (item.stock_amount * price)
  }, 0)

  async function executeDeleteItem(item: MaterialItem | ProductItem, type: InventoryType) {
    setConfirmDeleteItem(null)
    const isMaterial = type === 'materials'
    
    // OPTIMISTIC UPDATE: Remove locally first
    const previousState = isMaterial ? [...materials] : [...products]
    if (isMaterial) {
      setMaterials(prev => prev.filter(i => i.id !== item.id))
    } else {
      setProducts(prev => prev.filter(i => i.id !== item.id))
    }

    const url = isMaterial ? `/api/materials/${item.id}` : `/api/products/${item.id}`
    
    await fetchAction(
      fetchApi(url, { method: 'DELETE' }),
      {
        loading: `${item.name} siliniyor...`,
        success: 'Kayıt başarıyla silindi',
        error: 'Silme işlemi başarısız oldu',
        onSettled: () => {
          // Revalidate global stock triggers if necessary
          mutate('/api/inventory/products/warehouse')
        }
      }
    ).catch(() => {
      // ROLLBACK on error
      if (isMaterial) setMaterials(previousState as MaterialItem[])
      else setProducts(previousState as ProductItem[])
    })
  }

  const InventoryCard = ({ item, type }: { item: MaterialItem | ProductItem, type: InventoryType }) => {
    const isMaterial = type === 'materials'
    const code = isMaterial ? (item as MaterialItem).code : (item as ProductItem).sku
    const price = isMaterial ? (item as MaterialItem).average_price : (item as ProductItem).cost_price
    const isExpanded = expandedItemId === item.id
    
    return (
      <Card
        variant="glass"
        className={cn(
          'cursor-pointer transition-all duration-300 group overflow-hidden',
          item.critical_stock ? 'border-red-500/30 bg-red-500/5' : 'hover:border-primary/30'
        )}
        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
      >
        <CardBody className="p-0">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                {code && (
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-tighter">
                    {code}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {item.critical_stock && (
                  <Badge variant="soft" color="error" size="sm" className="animate-pulse">
                    Kritik
                  </Badge>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AccessControl action="delete" path="/inventory">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteItem({ item, type })
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AccessControl>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/inventory/${type}/${item.id}`)
                    }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Mevcut Stok</p>
                <p className="text-xl font-black text-foreground">
                  {item.stock_amount} <span className="text-sm font-normal text-foreground/50">{item.unit}</span>
                </p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Min. Seviye</p>
                <p className="text-lg font-bold text-foreground/70">
                  {item.min_stock_level} <span className="text-sm font-normal text-foreground/40">{item.unit}</span>
                </p>
              </div>
            </div>

            {price && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                <span className="text-xs font-medium text-foreground/60">
                  {isMaterial ? 'Ortalama Birim Fiyat' : 'Tahmini Üretim Maliyeti'}
                </span>
                <span className="text-sm font-bold text-primary">
                  ₺{price.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className={cn(
            "px-6 py-3 border-t border-border/50 flex items-center justify-between transition-colors",
            item.critical_stock ? "bg-red-500/10" : "bg-white/5 group-hover:bg-primary/5"
          )}>
            <div className={cn(
              'flex items-center gap-2 text-xs font-bold uppercase tracking-wider',
              item.critical_stock ? 'text-red-500' : 'text-emerald-500'
            )}>
              {item.critical_stock ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Stok Yetersiz
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  Durum İyi
                </>
              )}
            </div>
            <div className="text-[10px] font-bold text-foreground/30 uppercase">
              {item.category || 'Genel'}
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card variant="glass" className="animate-pulse">
        <CardBody className="p-20 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="mt-4 text-foreground/50 font-medium">Veriler hazırlanıyor...</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <AppDashboardLayout
      title="Stok Yönetimi"
      subtitle="Hammadde ve mamül depo yönetimi"
      icon={Package}
      className="animate-reveal"
      actions={
        <div className="flex items-center gap-2">
           <ExcelExportButton 
             data={activeTab === 'products' ? warehouseItems : filteredItems}
             filename={`Envanter_${activeTab}`}
             sheetName={activeTab === 'products' ? 'Mamül Depo' : 'Hammadde'}
           />
          {activeTab === 'products' && (
            <AccessControl action="create" path="/inventory">
              <Button
                variant="solid"
                color="primary"
                size="sm"
                onClick={() => router.push('/products/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Mamül
              </Button>
            </AccessControl>
          )}
        </div>
      }
    >
      <ConfirmDialog
        isOpen={!!confirmDeleteItem}
        onClose={() => setConfirmDeleteItem(null)}
        onConfirm={() => confirmDeleteItem && executeDeleteItem(confirmDeleteItem.item, confirmDeleteItem.type)}
        title={`${confirmDeleteItem?.type === 'materials' ? 'Malzeme' : 'Ürün'} Sil`}
        message={`"${confirmDeleteItem?.item.name}" ${confirmDeleteItem?.type === 'materials' ? 'malzeme' : 'ürün'} kaydını silmek istediğinize emin misiniz?`}
        variant="danger"
      />
      <ConfirmDialog
        isOpen={!!confirmBulkShip}
        onClose={() => setConfirmBulkShip(null)}
        onConfirm={async () => {
          if (!confirmBulkShip) return
          setConfirmBulkShip(null)
          const { items } = confirmBulkShip
          let successCount = 0
          let errorCount = 0
          for (const item of items) {
            try {
              let targetCustomerId = item.customer_id || (item.dealer_name ? await findOrCreateAccountByDealerName(item.dealer_name) : null)
              if (!item.barcode) { errorCount++; continue }
              await fetchApi('/api/shipments/ready-items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: item.barcode, customer_id: targetCustomerId, ready: true })
              })
              successCount++
            } catch (err) { errorCount++ }
          }
          if (successCount > 0) toast.success(`${successCount} mamül sevk edilebilir olarak işaretlendi!`)
          loadInventory()
        }}
        title="Toplu Sevk İşaretle"
        message={`${confirmBulkShip?.items.length} adet mamülü sevk edilebilir olarak işaretlemek istediğinize emin misiniz?`}
        variant="warning"
      />
      <ConfirmDialog
        isOpen={!!confirmDeleteWarehouseBarcode}
        onClose={() => setConfirmDeleteWarehouseBarcode(null)}
        onConfirm={async () => {
          if (!confirmDeleteWarehouseBarcode) return
          try {
            await fetchApi(`/api/inventory/products/warehouse?barcode_id=${encodeURIComponent(confirmDeleteWarehouseBarcode)}`, { method: 'DELETE' })
            toast.success('Mamül depodan silindi.')
            loadInventory()
          } catch (err: any) {
            toast.error('Silme hatası: ' + err.message)
          } finally {
            setConfirmDeleteWarehouseBarcode(null)
          }
        }}
        title="Mamülü Depodan Sil"
        message="Bu mamülü depodan silmek istediğinize emin misiniz?"
        variant="danger"
      />

      {shipSuccessMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in text-center">
          <Card variant="glass" className="max-w-md w-full p-8 shadow-2xl border-primary/20">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <Truck className="w-8 h-8 text-emerald-500 shadow-glow" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Sevk İşlemi Başarılı</h3>
            <p className="text-sm text-foreground/60 mb-8 leading-relaxed">Ürün sevk edilebilir olarak işaretlendi. Sevkiyat sayfasından sevk fişi oluşturabilirsiniz.</p>
            <Button onClick={() => setShipSuccessMessage(null)} className="w-full" size="lg">Tamam</Button>
          </Card>
        </div>
      )}

      <StockRealtime onUpdate={loadInventory} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass" className="group overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Toplam Mamül</p>
                <p className="text-3xl font-black text-foreground">{warehouseItems.length}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Factory className="w-7 h-7 text-primary shadow-glow" />
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="glass" className="group overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Kritik Stok</p>
                <p className="text-3xl font-black text-red-500">{criticalCount}</p>
              </div>
              <div className="p-4 bg-red-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-7 h-7 text-red-500 shadow-glow" />
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="glass" className="group overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Envanter Değeri</p>
                <p className="text-2xl font-black text-emerald-500">₺{totalValue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-emerald-500 shadow-glow" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="flex items-center gap-2 p-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-border/50 w-fit mx-auto shadow-lg">
        <Button
          variant={activeTab === 'products' ? 'solid' : 'ghost'}
          onClick={() => setActiveTab('products')}
          className={cn("rounded-xl px-10 py-3 transition-all", activeTab === 'products' && "shadow-lg shadow-primary/25")}
        >
          <Factory className="w-4 h-4 mr-2" />
          Mamül Depo
        </Button>
        <Button
          variant={activeTab === 'materials' ? 'solid' : 'ghost'}
          onClick={() => setActiveTab('materials')}
          className={cn("rounded-xl px-10 py-3 transition-all", activeTab === 'materials' && "shadow-lg shadow-primary/25")}
        >
          <Package className="w-4 h-4 mr-2" />
          Hammadde
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-reveal" style={{ animationDelay: '100ms' }}>
        <Card variant="glass" className="lg:col-span-3">
          <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
            <Input
              placeholder="Arama yapın..."
              leftIcon={<Search className="w-5 h-5" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              variant="filled"
            />
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                size="icon"
                className={cn("w-10 h-10 rounded-lg", viewMode === 'grid' && "shadow-lg shadow-primary/25")}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'solid' : 'ghost'}
                size="icon"
                className={cn("w-10 h-10 rounded-lg", viewMode === 'list' && "shadow-lg shadow-primary/25")}
                onClick={() => setViewMode('list')}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </CardBody>
        </Card>
        <Card variant="glass">
          <CardBody className="p-4 flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === 'all' ? 'solid' : 'soft'}
              color="primary"
              className="cursor-pointer h-10 px-5 rounded-xl flex items-center"
              onClick={() => setSelectedCategory('all')}
            >
              Tümü
            </Badge>
            {categories.slice(0, 2).map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'solid' : 'soft'}
                color="primary"
                className="cursor-pointer h-10 px-5 rounded-xl flex items-center"
                onClick={() => setSelectedCategory(category || '')}
              >
                {category}
              </Badge>
            ))}
          </CardBody>
        </Card>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-6 animate-reveal" style={{ animationDelay: '200ms' }}>
          {(() => {
            const filteredProducts = warehouseItems.filter(item => {
              const search = searchTerm.toLowerCase()
              return !searchTerm || item.product_name?.toLowerCase().includes(search) || item.dealer_name?.toLowerCase().includes(search) || item.barcode?.toLowerCase().includes(search)
            })
            const dealerGroups = filteredProducts.reduce((acc: Record<string, any[]>, item) => {
              const name = item.view_dealer_name || item.dealer_name || 'Diğer'
              if (!acc[name]) acc[name] = []
              acc[name].push(item)
              return acc
            }, {})
            const dealerNames = Object.keys(dealerGroups).sort()

            return filteredProducts.length === 0 ? (
              <Card variant="glass"><CardBody className="p-20 text-center text-foreground/40">Kayıt bulunamadı.</CardBody></Card>
            ) : (
              <div className="space-y-6">
                <Card variant="glass" className="sticky top-0 z-10">
                  <CardBody className="p-4 flex items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedDealerTab === 'all' ? 'solid' : 'soft'}
                        color="primary"
                        className="cursor-pointer h-10 px-5 rounded-xl flex items-center"
                        onClick={() => setSelectedDealerTab('all')}
                      >
                        Hepsi ({filteredProducts.length})
                      </Badge>
                      {dealerNames.map(name => (
                        <Badge
                          key={name}
                          variant={selectedDealerTab === name ? 'solid' : 'soft'}
                          color="primary"
                          className="cursor-pointer h-10 px-5 rounded-xl flex items-center"
                          onClick={() => setSelectedDealerTab(name)}
                        >
                          {name} ({dealerGroups[name].length})
                        </Badge>
                      ))}
                    </div>
                    {selectedDealerTab !== 'all' && (
                      <Button
                        variant="solid"
                        color="success"
                        onClick={() => setConfirmBulkShip({ items: dealerGroups[selectedDealerTab], dealerTab: selectedDealerTab })}
                        className="shadow-lg shadow-emerald-500/20"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Sevk Et ({dealerGroups[selectedDealerTab].length})
                      </Button>
                    )}
                  </CardBody>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {(selectedDealerTab === 'all' ? filteredProducts : dealerGroups[selectedDealerTab] || []).map(item => (
                    <Card key={item.barcode_id} variant="glass" className="border-border/30 hover:border-primary/50 transition-all overflow-hidden">
                      <CardBody className="p-0">
                        <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-y-4 bg-white/5">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Cari</p>
                            <p className="text-sm font-bold truncate">{item.dealer_name || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Ürün</p>
                            <p className="text-sm font-bold truncate">{item.product_name || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Emir No</p>
                            <p className="text-sm font-mono">{item.production_order_number || '-'}</p>
                          </div>
                        </div>
                        <div className="p-6 border-t border-border/10">
                          {item.barcode && (
                            <BarcodeAndQRCode 
                              barcode={item.barcode} 
                              serialNumber={item.serial_number || ''}
                              barcodeId={item.barcode_id}
                              entryDate={formatDateTime(item.production_order_completed_at || item.barcode_created_at)}
                              isAlreadyShipped={!!item.shipment_id}
                              onPrintLabel={() => window.open(`/inventory/products/print-barcode-label?barcodeId=${item.barcode}`, '_blank')}
                              onDelete={() => setConfirmDeleteWarehouseBarcode(item.barcode_id)}
                              onShip={async () => {
                                try {
                                  let cid = item.customer_id || (item.dealer_name ? await findOrCreateAccountByDealerName(item.dealer_name) : null)
                                  await fetchApi('/api/shipments/ready-items', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ barcode: item.barcode, customer_id: cid, ready: true })
                                  })
                                  setShipSuccessMessage('İşlem başarılı.')
                                  loadInventory()
                                } catch (err) { toast.error('Hata oluştu') }
                              }}
                            />
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card variant="glass" className="animate-reveal"><CardBody className="p-20 text-center text-foreground/40">Stok bulunamadı.</CardBody></Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal" style={{ animationDelay: '300ms' }}>
          {filteredItems.map(item => <InventoryCard key={item.id} item={item} type="materials" />)}
        </div>
      ) : (
        <Card variant="glass" className="animate-reveal overflow-hidden" style={{ animationDelay: '300ms' }}>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-white/5">
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Hammadde</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-widest">SKU</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Stok</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Durum</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => router.push(`/inventory/materials/${item.id}`)}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold">{item.name}</div>
                        <div className="text-[10px] text-foreground/40 uppercase">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-foreground/60">{(item as any).code || '-'}</td>
                      <td className="px-6 py-4 text-sm font-black">{item.stock_amount} <span className="text-xs font-normal opacity-50">{item.unit}</span></td>
                      <td className="px-6 py-4">
                        <Badge size="sm" variant={item.critical_stock ? 'soft' : 'outline'} color={item.critical_stock ? 'error' : 'success'}>
                          {item.critical_stock ? 'Kritik' : 'Güvende'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-foreground/20 hover:text-primary"><ArrowRight className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </AppDashboardLayout>
  )
}

export default InventoryPage