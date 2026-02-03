'use client'

import { useCallback, useEffect, useState } from 'react'
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
  Download
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
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
  const [activeTab, setActiveTab] = useState<InventoryType>(
    pathname?.includes('/inventory/products') ? 'products' : 'materials'
  )
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [warehouseItems, setWarehouseItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  const loadInventory = useCallback(async () => {
    try {
      const [materialsData, productsData, warehouseData] = await Promise.all([
        fetchApi('/api/inventory/materials'),
        fetchApi('/api/inventory/products'),
        fetchApi('/api/inventory/products/warehouse').catch(() => []) // Mamül depo verileri
      ])
      setMaterials(Array.isArray(materialsData) ? materialsData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setWarehouseItems(Array.isArray(warehouseData) ? warehouseData : [])
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
    setActiveTab(pathname?.includes('/inventory/products') ? 'products' : 'materials')
  }, [pathname])

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
          <Button
            variant="solid"
            color="primary"
            size="sm"
            onClick={() => router.push(`/inventory/${activeTab}/new`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni {activeTab === 'materials' ? 'Hammadde' : 'Mamül'}
          </Button>
        </>
      }
    >
      <StockRealtime onUpdate={loadInventory} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Hammadde</p>
                <p className="text-lg font-semibold text-gray-900">{materials.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card variant="flat">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Factory className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Mamül</p>
                <p className="text-lg font-semibold text-gray-900">{products.length}</p>
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

      {/* Tab Navigation */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-1">
              <Button
                variant={activeTab === 'materials' ? 'solid' : 'ghost'}
                color="primary"
                size="sm"
                onClick={() => setActiveTab('materials')}
              >
                <Package className="w-4 h-4 mr-2" />
                Hammadde ({materials.length})
              </Button>
              <Button
                variant={activeTab === 'products' ? 'solid' : 'ghost'}
                color="primary"
                size="sm"
                onClick={() => setActiveTab('products')}
              >
                <Factory className="w-4 h-4 mr-2" />
                Mamül ({products.length})
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Input
                placeholder={`${activeTab === 'materials' ? 'Hammadde' : 'Mamül'} ara...`}
                leftIcon={<Search className="w-4 h-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
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
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">Yükleniyor...</p>
              </CardBody>
            </Card>
          ) : warehouseItems.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <div className="text-gray-500">
                  Mamül depoda ürün bulunmamaktadır.
                </div>
              </CardBody>
            </Card>
          ) : (
            warehouseItems
              .filter((item) => {
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
              .map((item) => {
                const notes = item.order_notes || ''
                const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
                const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
                const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
                const fabricCode = fabricMatch ? fabricMatch[1].trim() : null
                const caseInfo = caseMatch ? caseMatch[1].trim() : null
                const legInfo = legMatch ? legMatch[1].trim() : null

                return (
                  <Card key={item.barcode_id} className="bg-gray-900 border border-gray-800">
                    <CardBody className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-mono text-sm text-blue-400">
                              {item.production_order_number || '-'}
                            </span>
                            {item.production_order_created_at && (
                              <span className="text-xs text-gray-500">
                                {new Date(item.production_order_created_at).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {item.product_name}
                          </h3>
                          <div className="text-sm text-gray-400 mb-2">
                            {item.product_sku}
                          </div>
                        </div>
                      </div>

                      {/* Barkod Detayları */}
                      <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Barkod</div>
                            <div className="text-white font-mono">{item.barcode}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Seri No</div>
                            <div className="text-white font-mono">{item.serial_number}</div>
                          </div>
                        </div>
                      </div>

                      {/* Sipariş Bilgileri */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                        {item.dealer_name && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Bayi</div>
                            <div className="text-white">{item.dealer_name}</div>
                          </div>
                        )}
                        {item.customer_name && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Müşteri</div>
                            <div className="text-white">{item.customer_name}</div>
                          </div>
                        )}
                        {item.customer_order_number && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Sipariş No</div>
                            <div className="text-white">{item.customer_order_number}</div>
                          </div>
                        )}
                        {item.configuration && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Konfigürasyon</div>
                            <div className="text-white">{item.configuration}</div>
                          </div>
                        )}
                      </div>

                      {/* Ürün Detayları (Kumaş, Ayak, Kasa) */}
                      {(fabricCode || legInfo || caseInfo) && (
                        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            {fabricCode && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">KUMAŞ</div>
                                <div className="text-white">{fabricCode}</div>
                              </div>
                            )}
                            {legInfo && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">AYAK</div>
                                <div className="text-white">{legInfo}</div>
                              </div>
                            )}
                            {caseInfo && (
                              <div>
                                <div className="text-xs text-gray-400 mb-1">KASA</div>
                                <div className="text-white">{caseInfo}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Açıklama */}
                      {item.order_notes && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-1">Açıklama</div>
                          <div className="text-sm text-gray-300 break-words whitespace-normal">
                            {item.order_notes}
                          </div>
                        </div>
                      )}

                      {/* Tamamlanma Tarihi */}
                      {item.production_order_completed_at && (
                        <div className="text-xs text-gray-500">
                          Tamamlanma: {new Date(item.production_order_completed_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )
              })
          )}
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