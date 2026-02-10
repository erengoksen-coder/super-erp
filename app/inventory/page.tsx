'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
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
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'

// Barkod ve QR Kod Component
function BarcodeAndQRCode({ barcode, serialNumber, barcodeId, entryDate, onPrintLabel, onShip, onDelete, isAlreadyShipped }: { 
  barcode: string; 
  serialNumber: string; 
  barcodeId: string; 
  entryDate: string;
  onPrintLabel: () => void;
  onShip: () => void;
  onDelete?: () => void | Promise<void>;
  /** Sevki onaylanmış / zaten sevk edilmiş kartta Sevk et butonu soluk ve devre dışı */
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
    <div className="mb-2 p-2 bg-gray-700/50 rounded border border-gray-600">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Barkod Görseli */}
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-400 mb-1">Barkod</div>
            <div className="bg-white p-1 rounded border border-gray-600">
              <canvas ref={canvasRef} className="max-w-full h-auto" style={{ maxWidth: '150px', height: 'auto' }} />
            </div>
          </div>
          {/* QR Kod */}
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-400 mb-1">QR Kod</div>
            <div className="bg-white p-1 rounded border border-gray-600 inline-block">
              <img 
                src={qrCodeUrl}
                alt="QR Code" 
                className="w-14 h-14"
              />
            </div>
          </div>
        </div>
        {/* Depoya Giriş Tarihi */}
        <div className="flex-shrink-0 text-right px-3 py-2 bg-gray-700/50 rounded border border-gray-600">
          <div className="text-xs text-gray-400 mb-1">DEPOYA GİRİŞ TARİHİ</div>
          <div className="text-white text-xs font-semibold">{entryDate || '-'}</div>
        </div>
        {/* Butonlar */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          <Button
            variant="solid"
            color="primary"
            size="sm"
            onClick={onPrintLabel}
            className="flex items-center justify-center space-x-2 !bg-blue-600 hover:!bg-blue-700 !text-white border-0 shadow-md hover:shadow-lg transition-all whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Etiket Yazdır</span>
          </Button>
          <Button
            variant="solid"
            color="success"
            size="sm"
            onClick={isAlreadyShipped ? undefined : onShip}
            disabled={isAlreadyShipped}
            title={isAlreadyShipped ? 'Bu kart zaten sevk edildi, tekrar sevk oluşturulamaz' : undefined}
            className={cn(
              'flex items-center justify-center space-x-2 border-0 shadow-md transition-all whitespace-nowrap',
              isAlreadyShipped
                ? '!bg-gray-500 !text-gray-300 cursor-not-allowed opacity-60'
                : '!bg-green-600 hover:!bg-green-700 !text-white hover:shadow-lg'
            )}
          >
            <Truck className="w-4 h-4" />
            <span>Sevk Et</span>
          </Button>
          {onDelete && (
            <Button
              variant="solid"
              color="error"
              size="sm"
              onClick={onDelete}
              className="flex items-center justify-center space-x-2 !bg-red-600 hover:!bg-red-700 !text-white border-0 shadow-md hover:shadow-lg transition-all whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sil</span>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div className="text-purple-300">
          <span className="font-semibold">Barkod:</span> {barcode}
        </div>
        {serialNumber && (
          <div className="text-purple-300">
            <span className="font-semibold">Seri No:</span> {serialNumber}
          </div>
        )}
      </div>
    </div>
  )
}
import StockRealtime from '@/app/_components/stock-realtime'

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
  const [activeTab, setActiveTab] = useState<InventoryType>('products')
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [warehouseItems, setWarehouseItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedDealerTab, setSelectedDealerTab] = useState<string>('all') // 'all' = tümü, '' = boş, 'dealerName' = seçili cari
  const [shipSuccessMessage, setShipSuccessMessage] = useState<string | null>(null)

  // Bayi adından account ID bul veya oluştur
  const findOrCreateAccountByDealerName = useCallback(async (dealerName: string | null | undefined): Promise<string | null> => {
    if (!dealerName || dealerName.trim() === '') {
      return null
    }

    const trimmedName = dealerName.trim()
    
    // Önce accounts listesinde ara
    const existingAccount = accounts.find(acc => 
      acc.name && acc.name.trim().toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (existingAccount) {
      return existingAccount.id
    }

    // Bulunamazsa API'den ara veya oluştur
    try {
      // Önce accounts API'sinden tüm müşterileri al
      const allAccounts = await fetchApi('/api/accounts?type=customer')
      const foundAccount = Array.isArray(allAccounts) 
        ? allAccounts.find((acc: any) => acc.name && acc.name.trim().toLowerCase() === trimmedName.toLowerCase())
        : null
      
      if (foundAccount) {
        setAccounts(prev => [...prev, foundAccount])
        return foundAccount.id
      }

      // Hala bulunamazsa yeni account oluştur
      const newAccount = await fetchApi<{ id?: string; code?: string } | unknown>('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          type: 'customer'
        })
      })
      const acc = newAccount as { id?: string; code?: string } | null | undefined
      if (acc && acc.id) {
        setAccounts(prev => [...prev, { id: acc.id, code: acc.code ?? '', name: trimmedName, type: 'customer' }])
        return acc.id
      }
    } catch (error) {
      console.error('Account bulunamadı veya oluşturulamadı:', error)
    }

    return null
  }, [accounts])

  const loadInventory = useCallback(async () => {
    try {
      const [materialsData, productsData, warehouseData, accountsData] = await Promise.all([
        fetchApi('/api/inventory/materials'),
        fetchApi('/api/inventory/products'),
        fetchApi('/api/inventory/products/warehouse').catch((err) => {
          console.error('Warehouse API error:', err)
          return []
        }), // Mamül depo verileri
        fetchApi('/api/accounts?type=customer').catch((err) => {
          console.error('Accounts API error:', err)
          return []
        }) // Müşteri hesapları
      ])
      setMaterials(Array.isArray(materialsData) ? materialsData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      const warehouseArray = Array.isArray(warehouseData) ? warehouseData : []
      console.log('Warehouse items loaded:', warehouseArray.length, warehouseArray)
      setWarehouseItems(warehouseArray)
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

  useEffect(() => {
    setActiveTab('products')
  }, [pathname])

  // Arama yapıldığında sekmeyi 'all' yap ve kartları göster
  useEffect(() => {
    if (searchTerm) {
      setSelectedDealerTab('all')
    }
  }, [searchTerm])

  // Boşluğa tıklandığında CARİ sekmesini kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Eğer tıklanan alan boşluk veya card dışındaysa sekmeyi kapat
      if (target.classList.contains('space-y-4') || 
          (target.tagName === 'DIV' && !target.closest('.bg-gray-800') && 
           !target.closest('.cursor-pointer') && 
           !target.closest('button') &&
           !target.closest('input'))) {
        setSelectedDealerTab('all')
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])


  const currentItems = activeTab === 'materials' ? materials : products
  const categories = [...new Set(currentItems.map(item => item.category).filter(Boolean))]

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

  async function handleDeleteItem(item: MaterialItem | ProductItem, type: InventoryType) {
    const isMaterial = type === 'materials'
    const label = isMaterial ? 'malzeme' : 'ürün'
    if (!confirm(`"${item.name}" ${label} kaydını silmek istediğinize emin misiniz?`)) return
    try {
      const url = isMaterial ? `/api/materials/${item.id}` : `/api/products/${item.id}`
      const res = await fetch(url, { method: 'DELETE', cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Silinemedi')
      }
      await loadInventory()
    } catch (e: any) {
      toast.error('Hata: ' + (e instanceof Error ? e.message : 'Kayıt silinemedi'))
    }
  }

  const InventoryCard = ({ item, type }: { item: MaterialItem | ProductItem, type: InventoryType }) => {
    const isMaterial = type === 'materials'
    const code = isMaterial ? (item as MaterialItem).code : (item as ProductItem).sku
    const price = isMaterial ? (item as MaterialItem).average_price : (item as ProductItem).cost_price
    const isExpanded = expandedItemId === item.id
    
    return (
      <Card
        className={cn(
          'hover-lift cursor-pointer transition-all duration-200',
          item.critical_stock && 'border-red-200 bg-red-50'
        )}
        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
      >
        <CardBody className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {item.name}
              </h3>
              {code && (
                <p className="text-sm text-gray-500">
                  {code}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {item.critical_stock && (
                <Badge variant="soft" color="error" size="sm" dot>
                  Kritik
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteItem(item, type)
                }}
                title="Kaydı sil"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/inventory/${type}/${item.id}`)
                }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Stok</p>
              <p className="text-lg font-semibold text-gray-900">
                {item.stock_amount} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Min. Stok</p>
              <p className="text-sm text-gray-700">
                {item.min_stock_level} {item.unit}
              </p>
            </div>
          </div>

          {price && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">
                {isMaterial ? 'Ortalama Fiyat' : 'Maliyet Fiyatı'}
              </p>
              <p className="text-sm font-medium text-gray-900">
                ₺{price.toFixed(2)}
              </p>
            </div>
          )}

          {item.category && (
            <div className="mb-4">
              <Badge variant="outline" size="sm">
                {item.category}
              </Badge>
            </div>
          )}

          {isExpanded && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white/50 p-3 text-sm text-gray-700">
              <div>Birim: {item.unit}</div>
              {code && <div>Kod/SKU: {code}</div>}
              {isMaterial && (item as MaterialItem).supplier_name && (
                <div>Tedarikçi: {(item as MaterialItem).supplier_name}</div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className={cn(
              'font-medium',
              item.critical_stock ? 'text-red-600' : 'text-green-600'
            )}>
              {item.critical_stock ? (
                <>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {item.stock_amount} {item.unit} eksik
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Güvende
                </>
              )}
            </div>
            <div className="text-gray-500">
              {isMaterial ? (item as MaterialItem).supplier_name : ''}
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppDashboardLayout
      title="Stok Yönetimi"
      subtitle="Hammadde ve mamül depo yönetimi"
      icon={Package}
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Excel İndir
          </Button>
          {activeTab === 'products' && (
            <Button
              variant="solid"
              color="primary"
              size="sm"
              onClick={() => router.push('/products/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Mamül
            </Button>
          )}
        </>
      }
    >
      {/* Sevk edilebilir mesajı - Tamam deyince kapanır */}
      {shipSuccessMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-2">Ürün sevk edilebilir</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{shipSuccessMessage}</p>
            <button
              type="button"
              onClick={() => setShipSuccessMessage(null)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
      <StockRealtime onUpdate={loadInventory} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Factory className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Mamül</p>
                <p className="text-lg font-semibold text-gray-900">{warehouseItems.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Kritik Stok</p>
                <p className="text-lg font-semibold text-red-600">{criticalCount}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Değer</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₺{totalValue.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Arama Filtresi */}
      <Card>
        <CardBody className="p-3">
          <div className="flex items-center space-x-3">
            <Input
              placeholder="Müşteri, cari, ürün, takip no, SKU ara..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-md"
            />
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'solid' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Category Filter */}
      {categories.length > 0 && (
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Kategori:</span>
              <Badge
                variant={selectedCategory === 'all' ? 'solid' : 'outline'}
                color="primary"
                className="cursor-pointer"
                onClick={() => setSelectedCategory('all')}
              >
                Tümü
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'solid' : 'outline'}
                  color="primary"
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category || '')}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Mamül Depo - Sipariş Kartları Görünümü */}
      {activeTab === 'products' ? (
        <div 
          className="space-y-4"
          onClick={(e) => {
            const target = e.target as HTMLElement
            // Boşluğa veya card dışına tıklandığında sekmeleri kapat
            if (target.classList.contains('space-y-4') || 
                (target.tagName === 'DIV' && !target.closest('.bg-gray-800') && !target.closest('.filter-dropdown-container') && !target.closest('.cursor-pointer'))) {
              setSelectedDealerTab('all')
            }
          }}
        >
          {loading ? (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">Yükleniyor...</p>
              </CardBody>
            </Card>
          ) : (() => {
            console.log('Rendering products tab:', { 
              loading, 
              warehouseItemsLength: warehouseItems.length, 
              productsLength: products.length,
              warehouseItems: warehouseItems.slice(0, 3), // İlk 3 item'ı göster
              activeTab 
            })
            
            // Ürünleri filtrele
            const filteredItems = warehouseItems.filter((item) => {
              if (!searchTerm) return true
              const search = searchTerm.toLowerCase()
              return (
                item.product_name?.toLowerCase().includes(search) ||
                item.product_sku?.toLowerCase().includes(search) ||
                item.barcode?.toLowerCase().includes(search) ||
                item.serial_number?.toLowerCase().includes(search) ||
                item.production_order_number?.toLowerCase().includes(search) ||
                item.customer_order_number?.toLowerCase().includes(search) ||
                item.customer_name?.toLowerCase().includes(search) ||
                item.dealer_name?.toLowerCase().includes(search)
              )
            })

            // CARİ ADI'ları grupla
            const dealerGroups = filteredItems.reduce((acc: Record<string, typeof filteredItems>, item) => {
              const dealerName = item.dealer_name || 'Belirtilmemiş'
              if (!acc[dealerName]) {
                acc[dealerName] = []
              }
              acc[dealerName].push(item)
              return acc
            }, {})

            const dealerNames = Object.keys(dealerGroups).sort()

            return filteredItems.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="text-gray-500">
                  {searchTerm ? `"${searchTerm}" araması için sonuç bulunamadı.` : 'Mamül depoda ürün bulunmamaktadır.'}
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Arama Sonuç Bilgisi */}
              {searchTerm && (
                <Card>
                  <CardBody className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">"{searchTerm}"</span> araması için <span className="font-semibold text-blue-600">{filteredItems.length}</span> adet mamül bulundu.
                      </div>
                      <div className="text-sm text-gray-500">
                        Toplam: <span className="font-semibold">{filteredItems.length} adet</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
              
              {/* CARİ ADI Sekmeleri */}
              <Card>
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center space-x-2 flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant={selectedDealerTab === 'all' ? 'solid' : 'outline'}
                        color="primary"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDealerTab('all')
                        }}
                      >
                        Tümü ({filteredItems.length})
                      </Badge>
                      {dealerNames.map((dealerName) => (
                        <Badge
                          key={dealerName}
                          variant={selectedDealerTab === dealerName ? 'solid' : 'outline'}
                          color="primary"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Eğer zaten seçiliyse boş yap (hiçbir şey gösterme), değilse aç
                            setSelectedDealerTab(selectedDealerTab === dealerName ? '' : dealerName)
                          }}
                        >
                          {dealerName} ({dealerGroups[dealerName].length})
                        </Badge>
                      ))}
                    </div>
                    {/* CARİ sekmesi seçiliyse tüm mamülleri sevk et butonu */}
                    {selectedDealerTab !== 'all' && selectedDealerTab !== '' && dealerGroups[selectedDealerTab] && (
                      <Button
                        variant="solid"
                        color="success"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          try {
                            const items = dealerGroups[selectedDealerTab]
                            if (!items || items.length === 0) {
                              toast.warning('Bu cariye ait mamül bulunamadı')
                              return
                            }
                            
                            if (!confirm(`${items.length} adet mamülü sevk edilebilir olarak işaretlemek istediğinize emin misiniz?`)) {
                              return
                            }

                            let successCount = 0
                            let errorCount = 0
                            const errors: string[] = []

                            for (const item of items) {
                              try {
                                let targetCustomerId = item.customer_id
                                
                                if (!targetCustomerId && item.dealer_name) {
                                  targetCustomerId = await findOrCreateAccountByDealerName(item.dealer_name)
                                }
                                
                                if (!item.barcode) {
                                  errorCount++
                                  errors.push(`${item.product_name || 'Ürün'}: Barkod bulunamadı`)
                                  continue
                                }
                                
                                // fetchApi başarılıysa data döndürür, hata varsa exception fırlatır
                                await fetchApi('/api/shipments/ready-items', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    barcode: item.barcode,
                                    customer_id: targetCustomerId,
                                    ready: true
                                  })
                                })
                                
                                // Başarılı (exception fırlatılmadıysa)
                                successCount++
                              } catch (error: any) {
                                console.error(`Sevk et hatası (${item.barcode || 'Bilinmeyen'}):`, error)
                                errorCount++
                                const errorMsg = error?.message || 'Bilinmeyen hata'
                                errors.push(`${item.barcode || item.product_name || 'Ürün'}: ${errorMsg}`)
                              }
                            }

                            if (successCount > 0) {
                              setShipSuccessMessage(
                                `${successCount} adet mamül sevk edilebilir olarak işaretlendi.${errorCount > 0 ? ` ${errorCount} adet mamülde hata oluştu.` : ''} Sevkiyat sayfasından sevk fişi oluşturabilirsiniz.`
                              )
                              loadInventory()
                            } else {
                              toast.error(`Hata: Hiçbir mamül sevk edilebilir olarak işaretlenemedi. Hatalar: ${errors.slice(0, 3).join(', ')}`)
                            }
                          } catch (error: unknown) {
                            console.error('Toplu sevk et hatası:', error)
                            toast.error('Hata: ' + (error instanceof Error ? error.message : 'Toplu sevk işlemi sırasında bir hata oluştu'))
                          }
                        }}
                        className="flex items-center justify-center space-x-2 !bg-green-600 hover:!bg-green-700 !text-white"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Tümünü Sevk Et ({dealerGroups[selectedDealerTab]?.length || 0})</span>
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Seçili CARİ ADI'na göre ürünleri göster */}
              {selectedDealerTab !== '' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedDealerTab === 'all' ? filteredItems : dealerGroups[selectedDealerTab] || [])
                    .map((item) => {
                const notesText = item.order_notes || ''
                const fabricMatch = notesText.match(/Kumaş:\s*([^|]+)/i)
                const caseMatch = notesText.match(/Kasa:\s*([^|]+)/i)
                const legMatch = notesText.match(/Ayak:\s*([^|]+)/i)
                const unitMatch = notesText.match(/Birim:\s*([^|]+)/i)
                const cleanedNotes = notesText
                  .replace(/Kumaş:\s*[^|]+/gi, '')
                  .replace(/Kasa:\s*[^|]+/gi, '')
                  .replace(/Ayak:\s*[^|]+/gi, '')
                  .replace(/Birim:\s*[^|]+/gi, '')
                  .replace(/\|\s*\|\s*/g, '|')
                  .replace(/^\|\s*|\s*\|$/g, '')
                  .trim()
                const quantityUnit = (unitMatch?.[1] || 'ADET').toString().trim()

                return (
                  <div
                    key={item.barcode_id}
                    className="bg-gray-800 rounded-lg p-2 border border-gray-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                        <div className="text-white text-sm">{item.dealer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                        <div className="text-white text-sm">{item.product_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KONFİGÜRASYON</div>
                        <div className="text-white text-sm">{item.configuration || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Durum</div>
                        <div>
                          <span className="px-2 py-1 rounded text-xs border bg-green-900/30 text-green-400 border-green-700">
                            Mamül Depoda
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Üretim Emri</div>
                        <div className="text-white text-sm">{item.production_order_number || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                        <div className="text-white text-sm">{item.customer_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                        <div className="text-white text-sm">
                          {fabricMatch ? fabricMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                        <div className="text-white text-sm break-words whitespace-normal">
                          {cleanedNotes || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                        <div className="text-white text-sm">1 {quantityUnit}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">KASA</div>
                        <div className="text-white text-sm">
                          {caseMatch ? caseMatch[1].trim() : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                        <div className="text-white text-sm">
                          {formatDate(item.order_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AYAK</div>
                        <div className="text-white text-sm">
                          {legMatch ? legMatch[1].trim() : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Barkod ve QR Kod */}
                    {item.barcode && (
                      <BarcodeAndQRCode 
                        barcode={item.barcode} 
                        serialNumber={item.serial_number || ''}
                        barcodeId={item.barcode_id}
                        entryDate={formatDateTime(item.production_order_completed_at || item.barcode_created_at)}
                        isAlreadyShipped={!!(item.shipment_id && String(item.shipment_id).trim())}
                        onPrintLabel={() => {
                          window.open(`/inventory/products/print-barcode-label?barcodeId=${item.barcode}`, '_blank')
                        }}
                        onDelete={async () => {
                          if (!confirm('Bu mamülü depodan silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
                          try {
                            await fetchApi(`/api/inventory/products/warehouse?barcode_id=${encodeURIComponent(item.barcode_id)}`, { method: 'DELETE' })
                            toast.success('Mamül depodan silindi.')
                            loadInventory()
                          } catch (err: any) {
                            toast.error('Hata: ' + (err instanceof Error ? err.message : 'Silinemedi'))
                          }
                        }}
                        onShip={async () => {
                          try {
                            // Önce customer_id varsa onu kullan
                            let targetCustomerId = item.customer_id
                            
                            // Eğer customer_id yoksa ama dealer_name varsa, bayi adından account bul veya oluştur
                            if (!targetCustomerId && item.dealer_name) {
                              targetCustomerId = await findOrCreateAccountByDealerName(item.dealer_name)
                            }
                            
                            // Ürünü sevk edilebilir olarak işaretle (barkod otomatik okunmuş olarak eklenmez)
                            if (item.barcode) {
                              await fetchApi('/api/shipments/ready-items', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  barcode: item.barcode,
                                  customer_id: targetCustomerId,
                                  ready: true
                                })
                              })
                              
                              setShipSuccessMessage('Sevkiyat sayfasından sevk fişi oluşturabilirsiniz.')
                              
                              // Sayfayı yenile (sevk edilebilir ürünler listesini güncellemek için)
                              loadInventory()
                            }
                          } catch (error: any) {
                            console.error('Sevk et hatası:', error)
                            toast.error('Hata: ' + (error instanceof Error ? error.message : 'Sevk edilebilir olarak işaretlenirken bir hata oluştu'))
                          }
                        }}
                      />
                    )}
                  </div>
                )
              })}
                </div>
              )}
              {selectedDealerTab === '' && (
                <Card>
                  <CardBody className="p-12 text-center">
                    <div className="text-gray-500">
                      Bir CARİ seçin veya "Tümü"ne tıklayın.
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )
          })()}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <div className="text-gray-500">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Arama kriterlerinize uygun stok bulunamadı'
                : `Henüz ${activeTab === 'materials' ? 'hammadde' : 'mamül'} bulunmamaktadır`
              }
            </div>
          </CardBody>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <InventoryCard 
              key={item.id} 
              item={item} 
              type={activeTab}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'materials' ? 'Hammadde' : 'Mamül'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kod/SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min. Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/inventory/${activeTab}/${item.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        {item.category && (
                          <div className="text-xs text-gray-500">{item.category}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(item as any).code || (item as any).sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.stock_amount} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.min_stock_level} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          size="sm"
                          variant={item.critical_stock ? 'solid' : 'soft'}
                          color={item.critical_stock ? 'error' : 'success'}
                        >
                          {item.critical_stock ? 'Kritik' : 'Güvende'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle actions
                          }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
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