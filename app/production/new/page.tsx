'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { generateProductionOrderNumber } from '@/lib/utils/codeGenerator'
import { AlertCircle, CheckCircle, Package, Factory, Search, Filter } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { LogoWithBackground } from '@/components/Logo'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'

interface Product {
  id: string
  sku: string
  name: string
}

interface Stock {
  id: string
  code: string
  name: string
  category: string
  unit: string
  current_quantity: number
}

interface BOMItem {
  stock_id: string
  stock_code: string
  stock_name: string
  stock_category: string
  stock_unit: string
  required_quantity: number
  fire_percentage: number
  available_quantity: number
  is_available: boolean
}

interface Order {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  product_name: string
  product_sku: string | null
  product_id: string | null
  quantity: number
  configuration: string | null
  status: string
  notes: string | null
  order_date: string | null
}

export default function NewProductionOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [quantity, setQuantity] = useState<number>(1)
  const [converting, setConverting] = useState(false)
  const [dueDate, setDueDate] = useState<string>('')
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [stockCheck, setStockCheck] = useState<{
    allAvailable: boolean
    insufficientItems: BOMItem[]
  } | null>(null)
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)
  const [showBOMCheckModal, setShowBOMCheckModal] = useState(false)
  const [bomCheckResults, setBomCheckResults] = useState<{
    order_number: string
    product_name: string
    bom_items: BOMItem[]
    all_available: boolean
  }[]>([])
  
  // Filtreler
  const [customerSearch, setCustomerSearch] = useState<string>('')
  const [productSearch, setProductSearch] = useState<string>('')
  const [hasInitializedFromQuery, setHasInitializedFromQuery] = useState(false)

  useEffect(() => {
    async function loadCode() {
      try {
        const { generateProductionOrderNumber } = await import('@/lib/utils/codeGenerator')
        const newCode = await generateProductionOrderNumber()
        setOrderNumber(newCode)
      } catch (error) {
        console.error('Kod oluşturulurken hata:', error)
        setOrderNumber('URE-001')
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
    loadProducts()
    loadOrders()
    
    // URL'den sipariş ID'lerini oku (sadece bir kez)
    if (!hasInitializedFromQuery) {
      const orderIdsParam = searchParams.get('from_orders') || searchParams.get('order_ids')
      if (orderIdsParam) {
        const orderIds = orderIdsParam.split(',').filter(id => id.trim())
        if (orderIds.length > 0) {
          setSelectedOrderIds(new Set(orderIds))
          // URL'den query parameter'ı temizle
          router.replace('/production/new', { scroll: false })
        }
      }
      setHasInitializedFromQuery(true)
    }
  }, [searchParams, router, hasInitializedFromQuery])

  async function loadProducts() {
    try {
      // Local database kullan
      const { localDB } = await import('@/lib/database/client')
      const data = await localDB.getProducts() as Product[]
      setProducts(data)
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
    }
  }

  async function loadOrders(customerName?: string) {
    try {
      let url = '/api/orders?status=pending'
      if (customerName && customerName.trim()) {
        url += `&customer_name=${encodeURIComponent(customerName.trim())}`
      }
      const data = await fetchApi<Order[]>(url)
      setOrders(data)
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error)
    }
  }

  async function findProductWithBom(candidates: Product[]) {
    for (const candidate of candidates) {
      try {
        const bomData = await fetchApi<any[]>(`/api/bom?product_id=${candidate.id}`)
        if (Array.isArray(bomData) && bomData.length > 0) {
          return candidate
        }
      } catch (error) {
        console.warn(`[Ürün Eşleştirme] BOM kontrolü başarısız: ${candidate.id}`, error)
      }
    }
    return null
  }

  async function resolveBomProductId(productId: string) {
    if (!productId) return ''

    const baseProduct = products.find(p => p.id === productId)
    if (!baseProduct) return productId

    const sameNameCandidates = products.filter(p =>
      p.name.toLowerCase().trim() === baseProduct.name.toLowerCase().trim()
    )

    const orderedCandidates = [
      baseProduct,
      ...sameNameCandidates.filter(p => p.id !== baseProduct.id),
    ]

    const withBom = await findProductWithBom(orderedCandidates)
    return withBom?.id || productId
  }

  // Sipariş seçildiğinde ürün ve miktarı otomatik doldur
  // NOT: selectedOrderIds kullanıldığında bu useEffect devre dışı bırakılmalı
  // Çünkü selectedOrderIds useEffect'i zaten ürün seçimini yapıyor
  useEffect(() => {
    let cancelled = false

    // Eğer selectedOrderIds kullanılıyorsa, bu useEffect'i atla
    if (selectedOrderIds.size > 0) {
      return
    }

    if (selectedOrderId) {
      const run = async () => {
        const order = orders.find(o => o.id === selectedOrderId)
        if (!order) return

        const candidates: Product[] = []
        if (order.product_id) {
          const productById = products.find(p => p.id === order.product_id)
          if (productById) candidates.push(productById)
        }
        if (order.product_sku) {
          const productBySku = products.find(p => p.sku === order.product_sku)
          if (productBySku && !candidates.some(p => p.id === productBySku.id)) {
            candidates.push(productBySku)
          }
        }
        if (order.product_name) {
          const nameLower = order.product_name.toLowerCase().trim()
          const nameMatches = products.filter(p => p.name.toLowerCase().includes(nameLower))
          for (const match of nameMatches) {
            if (!candidates.some(p => p.id === match.id)) {
              candidates.push(match)
            }
          }
        }

        let resolvedProduct: Product | null = null
        if (candidates.length > 0) {
          resolvedProduct = await findProductWithBom(candidates)
        }

        if (!cancelled) {
          if (resolvedProduct) {
            setSelectedProductId(resolvedProduct.id)
          } else if (order.product_id) {
            setSelectedProductId(order.product_id)
          } else if (order.product_sku) {
            const fallback = products.find(p => p.sku === order.product_sku)
            if (fallback) {
              setSelectedProductId(fallback.id)
            }
          }
          setQuantity(order.quantity)
        }
      }

      run()
    }

    return () => {
      cancelled = true
    }
  }, [selectedOrderId, selectedOrderIds, orders, products])

  // Seçili siparişlerden ilkini al ve forma aktar
  useEffect(() => {
    let cancelled = false

    if (selectedOrderIds.size > 0) {
      const run = async () => {
        const firstOrderId = Array.from(selectedOrderIds)[0]
        const order = orders.find(o => o.id === firstOrderId)
        if (!order) return

        // Ürünü bul ve seç - önce product_id ile, sonra product_sku ile, son olarak product_name ile, en son konfigürasyona göre
        let foundProduct = null
        
        // ÖNEMLİ: product_id veya product_sku varsa bile, ürün adının konfigürasyonla uyuşup uyuşmadığını kontrol et
        // Çünkü bazen product_id yanlış ürünü işaret edebilir (örn: "galata üçlü" yerine "galata berjer" olmalı)
        
        let hasConfigInProducts = false

        // Önce ürün adı + konfigürasyon kombinasyonuna göre bul (en spesifik ve güvenilir)
        if (order.product_name && order.configuration) {
          const productNameLower = order.product_name.toLowerCase().trim()
          const configLower = order.configuration.toLowerCase().trim()
          
          // Ürün adından parantez içindeki kısmı kaldır ve ilk kelimeyi al (örn: "GALATA (BERJER)" → "galata")
          const productBaseName = productNameLower
            .replace(/\([^)]*\)/g, '') // Parantez içindeki kısmı kaldır
            .trim()
            .split(' ')[0] // İlk kelimeyi al
            .trim()
          
          // Konfigürasyon kelimesini normalize et - SADECE BİR TANESİNİ SEÇ
          let configKeyword = ''
          if (configLower.includes('berjer')) {
            configKeyword = 'berjer'
          } else if (configLower.includes('üçlü') || configLower.includes('uclu') || configLower.includes('triple')) {
            configKeyword = 'üçlü'
          } else if (configLower.includes('köşe') || configLower.includes('kose') || configLower.includes('corner')) {
            configKeyword = 'köşe'
          } else if (configLower.includes('ikili') || configLower.includes('double') || configLower.includes('duo')) {
            configKeyword = 'ikili'
          }

          hasConfigInProducts = configKeyword
            ? products.some((p) => p.name.toLowerCase().includes(configKeyword))
            : false
          
          console.log(`[Ürün Eşleştirme] Başlangıç: product_name="${order.product_name}", configuration="${order.configuration}"`)
          console.log(`  → productBaseName="${productBaseName}", configKeyword="${configKeyword}"`)
          
          // Ürün adı + konfigürasyon kombinasyonuna göre bul (örn: "galata" + "berjer" = "galata berjer")
          if (configKeyword) {
            const expectedProductName = `${productBaseName} ${configKeyword}`.toLowerCase()
            
            // Diğer konfigürasyon kelimelerini belirle (seçilen konfigürasyon hariç)
            const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)
            
            // Önce tam eşleşme dene (en spesifik) - diğer konfigürasyonları içermemeli
            foundProduct = products.find(p => {
              const pNameLower = p.name.toLowerCase().trim()
              const isExactMatch = pNameLower === expectedProductName
              const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
              return isExactMatch && !hasOtherConfig
            })
            
            // Tam eşleşme yoksa, kısmi eşleşme dene (ürün adı + konfigürasyon kelimesi geçmeli)
            if (!foundProduct) {
              // Önce tüm eşleşen ürünleri bul
              const matchingProducts = products.filter(p => {
                const pNameLower = p.name.toLowerCase().trim()
                // Ürün adı hem base name hem de config keyword içermeli
                const hasBaseName = pNameLower.includes(productBaseName)
                const hasConfigKeyword = pNameLower.includes(configKeyword)
                // Ama diğer konfigürasyon kelimelerini içermemeli (berjer seçildiyse üçlü içermemeli)
                const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
                return hasBaseName && hasConfigKeyword && !hasOtherConfig
              })
              
              // Eğer birden fazla eşleşen ürün varsa, SKU'ya göre sırala (daha yüksek numaralı SKU'yu tercih et - PRD-894566 gibi)
              if (matchingProducts.length > 1) {
                console.log(`[Ürün Eşleştirme] ⚠️ Birden fazla eşleşen ürün bulundu (${matchingProducts.length} adet):`, matchingProducts.map(p => `${p.sku} - ${p.name}`))

                const productWithBom = await findProductWithBom(matchingProducts)
                if (productWithBom) {
                  foundProduct = productWithBom
                  if (!cancelled) {
                    setSelectedProductId(productWithBom.id)
                  }
                  console.log(`[Ürün Eşleştirme] ✅ BOM olan ürün seçildi: ${productWithBom.sku} - ${productWithBom.name}`)
                } else {
                  // SKU'ya göre sırala (ters sırada - en yüksek numara önce)
                  matchingProducts.sort((a, b) => {
                    const aNum = parseInt(a.sku.replace(/[^0-9]/g, '')) || 0
                    const bNum = parseInt(b.sku.replace(/[^0-9]/g, '')) || 0
                    return bNum - aNum // Ters sıralama - en yüksek numara önce
                  })

                  // En yüksek SKU numaralı ürünü seç (PRD-894566 gibi)
                  foundProduct = matchingProducts[0]
                  console.log(`[Ürün Eşleştirme] ✅ En yüksek SKU numaralı ürün seçildi: ${foundProduct.sku} - ${foundProduct.name}`)
                }
              } else if (matchingProducts.length === 1) {
                foundProduct = matchingProducts[0]
              }
            }
            
            if (foundProduct) {
              console.log(`[Ürün Eşleştirme] ✅ Sipariş: "${order.product_name}" (${order.configuration}) → Bulunan Ürün: "${foundProduct.name}" (ID: ${foundProduct.id}, SKU: ${foundProduct.sku})`)
              console.log(`  - productBaseName: "${productBaseName}", configKeyword: "${configKeyword}", expectedProductName: "${expectedProductName}"`)
              if (!cancelled) {
                setSelectedProductId(foundProduct.id)
              }
            } else {
              console.warn(`[Ürün Eşleştirme] ❌ Sipariş: "${order.product_name}" (${order.configuration}) → Ürün bulunamadı`)
              console.warn(`  - productBaseName: "${productBaseName}", configKeyword: "${configKeyword}", expectedProductName: "${expectedProductName}"`)
              console.warn(`  - Mevcut ürünler:`, products.map(p => p.name).filter(n => n.toLowerCase().includes(productBaseName) || n.toLowerCase().includes(configKeyword)))
              // Ürün bulunamadı - ürün seçme
            }
          }
        }
        
        // Eğer yukarıdaki eşleştirme başarısız olduysa, product_id veya product_sku ile dene (son çare)
        // Ama sadece bulunan ürünün adı konfigürasyonla uyuşuyorsa kullan
        if (!foundProduct && order.product_id) {
          const productById = products.find(p => p.id === order.product_id)
          if (productById) {
            if (!order.configuration || !hasConfigInProducts) {
              console.log(`[Ürün Eşleştirme] ⚠️ Konfigürasyon ürün adında yok, product_id fallback kullanılıyor: "${productById.name}"`)
              foundProduct = productById
              setSelectedProductId(productById.id)
            } else {
              // Ürün adının konfigürasyonla uyuşup uyuşmadığını kontrol et
              const productNameLower = productById.name.toLowerCase()
              const configLower = order.configuration?.toLowerCase() || ''
              const hasConfigMatch = configLower.includes('berjer') && productNameLower.includes('berjer') && !productNameLower.includes('üçlü') && !productNameLower.includes('uclu') ||
                                   configLower.includes('üçlü') && productNameLower.includes('üçlü') && !productNameLower.includes('berjer') ||
                                   configLower.includes('köşe') && productNameLower.includes('köşe') && !productNameLower.includes('berjer') && !productNameLower.includes('üçlü') ||
                                   configLower.includes('ikili') && productNameLower.includes('ikili') && !productNameLower.includes('berjer') && !productNameLower.includes('üçlü')
              
              if (hasConfigMatch) {
                console.log(`[Ürün Eşleştirme] ✅ product_id ile bulundu: "${productById.name}" (ID: ${productById.id})`)
                foundProduct = productById
                if (!cancelled) {
                  setSelectedProductId(productById.id)
                }
                foundProduct = productById
                if (!cancelled) {
                  setSelectedProductId(productById.id)
                }
              } else {
                console.warn(`[Ürün Eşleştirme] ⚠️ product_id ile bulunan ürün konfigürasyonla uyuşmuyor: "${productById.name}" (sipariş: ${order.configuration})`)
              }
            }
          }
        }
        
        if (!foundProduct && order.product_sku) {
          const productBySku = products.find(p => p.sku === order.product_sku)
          if (productBySku) {
            if (!order.configuration || !hasConfigInProducts) {
              console.log(`[Ürün Eşleştirme] ⚠️ Konfigürasyon ürün adında yok, product_sku fallback kullanılıyor: "${productBySku.name}"`)
              foundProduct = productBySku
              setSelectedProductId(productBySku.id)
            } else {
              // Ürün adının konfigürasyonla uyuşup uyuşmadığını kontrol et
              const productNameLower = productBySku.name.toLowerCase()
              const configLower = order.configuration?.toLowerCase() || ''
              const hasConfigMatch = configLower.includes('berjer') && productNameLower.includes('berjer') && !productNameLower.includes('üçlü') && !productNameLower.includes('uclu') ||
                                   configLower.includes('üçlü') && productNameLower.includes('üçlü') && !productNameLower.includes('berjer') ||
                                   configLower.includes('köşe') && productNameLower.includes('köşe') && !productNameLower.includes('berjer') && !productNameLower.includes('üçlü') ||
                                   configLower.includes('ikili') && productNameLower.includes('ikili') && !productNameLower.includes('berjer') && !productNameLower.includes('üçlü')
              
              if (hasConfigMatch) {
                console.log(`[Ürün Eşleştirme] ✅ product_sku ile bulundu: "${productBySku.name}" (ID: ${productBySku.id})`)
                foundProduct = productBySku
                if (!cancelled) {
                  setSelectedProductId(productBySku.id)
                }
                foundProduct = productBySku
                if (!cancelled) {
                  setSelectedProductId(productBySku.id)
                }
              } else {
                console.warn(`[Ürün Eşleştirme] ⚠️ product_sku ile bulunan ürün konfigürasyonla uyuşmuyor: "${productBySku.name}" (sipariş: ${order.configuration})`)
              }
            }
          }
        }

        if (!foundProduct && order.product_name) {
          const nameLower = order.product_name.toLowerCase().trim()
          const nameMatch = products.find(p => p.name.toLowerCase().includes(nameLower))
          if (nameMatch) {
            console.log(`[Ürün Eşleştirme] ⚠️ Ürün adı ile fallback bulundu: "${nameMatch.name}" (ID: ${nameMatch.id})`)
            foundProduct = nameMatch
            if (!cancelled) {
              setSelectedProductId(nameMatch.id)
            }
          }
        }

        if (!foundProduct && order.product_id) {
          console.warn(`[Ürün Eşleştirme] ⚠️ Ürün adı eşleşmedi, sipariş product_id ile devam ediliyor: ${order.product_id}`)
          if (!cancelled) {
            setSelectedProductId(order.product_id)
          }
        }

        if (!foundProduct && order.product_id) {
          console.warn(`[Ürün Eşleştirme] ⚠️ Ürün adı eşleşmedi, sipariş product_id ile devam ediliyor: ${order.product_id}`)
          if (!cancelled) {
            setSelectedProductId(order.product_id)
          }
        }
        if (!cancelled) {
          setQuantity(order.quantity)
        }
        // Sipariş ID'yi de seçili olarak işaretle (tek sipariş seçimi için)
        if (!cancelled) {
          setSelectedOrderId(firstOrderId)
        }
      }

      run()
    } else {
      // Seçim kaldırıldıysa formu temizle
      setSelectedOrderId('')
      setSelectedProductId('')
      setQuantity(1)
      setBomItems([])
      setStockCheck(null)
    }

    return () => {
      cancelled = true
    }
  }, [selectedOrderIds, orders, products])

  // Müşteri arama filtresi değiştiğinde siparişleri API'den yeniden yükle
  useEffect(() => {
    // İlk yüklemede (customerSearch boş) çalışmasın, zaten loadOrders() çağrılıyor
    if (customerSearch === '') {
      return
    }
    
    // Debounce için kısa bir gecikme ekle (kullanıcı yazmayı bitirdikten sonra)
    const timeoutId = setTimeout(() => {
      loadOrders(customerSearch.trim() || undefined)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch])
  
  // Filtrelenmiş siparişler (sadece ürün filtresi için - müşteri filtresi API'de yapılıyor)
  const filteredOrders = orders.filter(order => {
    const productMatch = !productSearch || 
      order.product_name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      order.product_sku?.toLowerCase().includes(productSearch.toLowerCase())
    return productMatch
  })

  // Ürün seçildiğinde hangi bayiye ait olduğunu göster
  const getDealerForProduct = (productId: string | null, productSku: string | null) => {
    if (!productId && !productSku) return null
    
    // Önce product_id ile eşleşen siparişi bul
    if (productId) {
      const order = orders.find(o => o.product_id === productId)
      if (order) return order.dealer_name
    }
    
    // Sonra product_sku ile eşleşen siparişi bul
    if (productSku) {
      const order = orders.find(o => o.product_sku === productSku)
      if (order) return order.dealer_name
    }
    
    // Ürün bilgisini products listesinden al ve siparişlerde ara
    if (productId) {
      const product = products.find(p => p.id === productId)
      if (product) {
        const order = orders.find(o => o.product_sku === product.sku)
        if (order) return order.dealer_name
      }
    }
    
    return null
  }

  async function loadBOM(productId: string) {
    if (!productId) {
      setBomItems([])
      setStockCheck(null)
      return
    }

    try {
      // Hangi ürün için BOM yüklendiğini logla
      const product = products.find(p => p.id === productId)
      if (product) {
        console.log(`[BOM Yükleme] Ürün: ${product.name} (ID: ${productId}, SKU: ${product.sku})`)
      }
      
      // API'den BOM verilerini al
      console.log(`[BOM Yükleme] BOM API çağrısı: /api/bom?product_id=${productId}`)
      const bomProductId = await resolveBomProductId(productId)
      if (bomProductId !== productId) {
        console.log(`[BOM Yükleme] ⚠️ Ürün BOM'u isim eşleşmesi ile bulundu: ${productId} → ${bomProductId}`)
      }

      const response = await fetch(`/api/bom?product_id=${bomProductId}`)
      if (!response.ok) {
        console.error(`[BOM Yükleme] API hatası: ${response.status} ${response.statusText}`)
        throw new Error('BOM yüklenemedi')
      }
      const bomData = await response.json()
      console.log(`[BOM Yükleme] API yanıtı: ${bomData?.length || 0} adet BOM öğesi`)

      if (!bomData || bomData.length === 0) {
        console.warn(`[BOM Yükleme] ⚠️ Ürün için BOM bulunamadı: ${product?.name} (ID: ${productId}, SKU: ${product?.sku})`)
        setBomItems([])
        setStockCheck({
          allAvailable: false,
          insufficientItems: [],
        })
        alert(`Bu ürün için reçete (BOM) bulunamadı: ${product?.name || product?.sku || productId}\n\nLütfen önce ürün reçetesini oluşturun.`)
        return
      }

      // Seçili siparişteki kumaş kodunu çıkar
      let orderFabricCode: string | null = null
      let orderFabricMaterial: any = null
      if (selectedOrderIds.size > 0) {
        const firstOrderId = Array.from(selectedOrderIds)[0]
        const order = orders.find(o => o.id === firstOrderId)
        if (order && (order as any).notes) {
          const fabricMatch = (order as any).notes.match(/Kumaş:\s*([^|]+)/i)
          if (fabricMatch) {
            orderFabricCode = fabricMatch[1].trim()
            const orderFabricCodeLower = orderFabricCode!.toLowerCase().trim()
            console.log(`[BOM Yükleme] Siparişteki kumaş kodu: ${orderFabricCode}`)
            
            // Hammadde depodan siparişteki kumaş koduna sahip malzemeyi bul
            try {
              const allMaterials = await fetchApi<any[]>('/api/materials')
              orderFabricMaterial = allMaterials.find((m) => 
                m.category && m.category.toLowerCase() === 'kumaş' && (
                  m.name.toLowerCase().trim() === orderFabricCodeLower ||
                  m.name.toLowerCase().trim().includes(orderFabricCodeLower) ||
                  (m.code && m.code.toLowerCase().trim() === orderFabricCodeLower)
                )
              )
              if (orderFabricMaterial) {
                console.log(`[BOM Yükleme] Siparişteki kumaş kodu için hammadde bulundu: ${orderFabricMaterial.name || orderFabricMaterial.code} (ID: ${orderFabricMaterial.id})`)
              } else {
                console.warn(`[BOM Yükleme] Siparişteki kumaş kodu için hammadde bulunamadı: ${orderFabricCode}`)
              }
            } catch (error) {
              console.error(`[BOM Yükleme] Hammadde arama hatası:`, error)
            }
          }
        }
      }

      // Her malzeme için güncel DEPO STOĞUNU al
      const items: BOMItem[] = await Promise.all(
        bomData.map(async (item: any) => {
          const materialCategory = item.material_category?.toLowerCase() || 
                                   (item.material_name?.toLowerCase().includes('kumaş') ? 'kumaş' : 'diğer')
          
          // Eğer malzeme kumaş kategorisindeyse ve siparişteki kumaş kodu varsa, siparişteki kumaş koduna göre hammadde depodan kumaşı kullan
          if (materialCategory === 'kumaş' && orderFabricMaterial) {
            // Siparişteki kumaş koduna göre hammadde depodan kumaşı kullan
            const firePercentage = parseFloat(item.fire_percentage) || 0
            const quantityWithFire = parseFloat(item.quantity_required) * (1 + (firePercentage / 100))
            const totalRequired = quantityWithFire * quantity
            const availableStock = parseFloat(orderFabricMaterial.stock_amount) || 0
            const isAvailable = availableStock >= totalRequired

            return {
              stock_id: orderFabricMaterial.id,
              stock_code: orderFabricMaterial.code || orderFabricMaterial.id,
              stock_name: orderFabricCode || orderFabricMaterial.name || 'Kumaş', // Siparişteki kumaş kodunu göster (örn: "ALASKA 10")
              stock_category: 'kumaş',
              stock_unit: orderFabricMaterial.unit || item.material_unit,
              required_quantity: parseFloat(item.quantity_required),
              fire_percentage: firePercentage,
              available_quantity: availableStock,
              is_available: isAvailable,
            }
          }
          
          // Diğer malzemeler için normal işlem
          // Malzeme stok bilgisini al - DEPO STOĞU
          let availableStock = 0
          const material = await fetchApi<any>(`/api/materials/${item.material_id}`)
          availableStock = parseFloat(material.stock_amount) || 0

          // Fire yüzdesini hesaba kat
          const firePercentage = parseFloat(item.fire_percentage) || 0
          const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))
          const totalRequired = quantityWithFire * quantity
          const isAvailable = availableStock >= totalRequired

          return {
            stock_id: item.material_id,
            stock_code: item.material_code || item.material_id,
            stock_name: item.material_name,
            stock_category: item.material_category || 
                           (item.material_name.toLowerCase().includes('kumaş') ? 'kumaş' : 
                            item.material_name.toLowerCase().includes('sünger') ? 'sünger' : 
                            item.material_name.toLowerCase().includes('ayak') ? 'ayak' : 'diğer'),
            stock_unit: item.material_unit,
            required_quantity: parseFloat(item.quantity_required),
            fire_percentage: firePercentage,
            available_quantity: availableStock,
            is_available: isAvailable,
          }
        })
      )

      setBomItems(items)
      checkStockAvailability(items)
    } catch (error) {
      console.error('BOM yüklenirken hata:', error)
      setBomItems([])
      setStockCheck({
        allAvailable: false,
        insufficientItems: [],
      })
      alert('BOM yüklenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
    }
  }

  function checkStockAvailability(items: BOMItem[]) {
    // Fire yüzdesini hesaba kat
    const insufficient = items.filter((item) => {
      // BOMItem'da fire_percentage yok, bu yüzden loadBOM'da hesaplanmış is_available kullanıyoruz
      return !item.is_available
    })
    
    setStockCheck({
      allAvailable: insufficient.length === 0,
      insufficientItems: insufficient,
    })
  }

  // BOM ve stok kontrolü - seçilen ürün için göster
  useEffect(() => {
    if (selectedProductId && quantity > 0) {
      loadBOM(selectedProductId)
    } else {
      // Ürün seçilmemişse temizle
      setBomItems([])
      setStockCheck(null)
    }
  }, [selectedProductId, quantity])

  async function handleStartProduction() {
    const hasSelectedOrders = selectedOrderIds.size > 0 || Boolean(selectedOrderId)
    if (!hasSelectedOrders && (!selectedProductId || quantity <= 0)) {
      alert('Lütfen ürün ve miktar seçin')
      return
    }

    // Eğer seçili siparişler varsa, onları dönüştür
    if (selectedOrderIds.size > 0) {
      if (!confirm(`${selectedOrderIds.size} siparişten üretim emri oluşturmak istediğinize emin misiniz?`)) {
        return
      }

      setLoading(true)
      try {
        const response = await fetch('/api/orders/convert-to-production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            order_ids: Array.from(selectedOrderIds),
            due_date: dueDate || null // Frontend'deki teslim tarihini gönder
          })
        })
        
        if (!response.ok) {
          const error = await response.json()
          let errorMsg = error.error || error.message || 'Dönüştürme başarısız'
          if (error.details && Array.isArray(error.details)) {
            errorMsg += `\n\n❌ Hatalar (${error.details.length} adet):\n${error.details.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}`
          }
          throw new Error(errorMsg)
        }

        const result = await response.json()
        let alertMessage = result.message || 'İşlem tamamlandı'
        
        if (result.skipped_orders && result.skipped_orders.length > 0) {
          alertMessage += `\n\n⚠️ Atlanan siparişler:\n${result.skipped_orders.join('\n')}`
        }
        
        if (result.errors && result.errors.length > 0) {
          alertMessage += `\n\n❌ Hatalar:\n${result.errors.join('\n')}`
        }
        
        alert(alertMessage)
        setSelectedOrderIds(new Set())
        setSelectedOrderId('')
        setSelectedProductId('')
        setQuantity(1)
        setBomItems([])
        setStockCheck(null)
        router.push('/production')
      } catch (error: any) {
        alert('Hata: ' + error.message)
      } finally {
        setLoading(false)
      }
      return
    }

    // Tek ürün için üretim emri oluştur
    // BOM kontrolü - API'den güncel stok bilgilerini al
    setLoading(true)
    try {
      // BOM verilerini API'den al
      const bomProductId = await resolveBomProductId(selectedProductId)
      const bomResponse = await fetch(`/api/bom?product_id=${bomProductId}`)
      if (!bomResponse.ok) {
        throw new Error('BOM bilgileri alınamadı')
      }
      const bomData = await bomResponse.json()
      
      if (!bomData || bomData.length === 0) {
        alert('Bu ürün için reçete (BOM) bulunamadı. Lütfen önce ürün reçetesini oluşturun.')
        setLoading(false)
        return
      }
      
      // Güncel stok kontrolü yap - DEPO STOĞUNU KONTROL ET
      const insufficientItems: BOMItem[] = []
      
      for (const item of bomData) {
        // Malzeme stok bilgisini al - DEPO STOĞU
        let availableStock = 0
        try {
          const material = await fetchApi<any>(`/api/materials/${item.material_id}`)
          availableStock = parseFloat(material.stock_amount) || 0
        } catch {
          // Malzeme bulunamadıysa hata ver
          insufficientItems.push({
            stock_id: item.material_id,
            stock_code: item.material_code || item.material_id,
            stock_name: item.material_name || 'Bilinmeyen malzeme',
            stock_category: 'diğer',
            stock_unit: item.material_unit || 'adet',
            required_quantity: parseFloat(item.quantity_required) || 0,
            fire_percentage: parseFloat(item.fire_percentage) || 0,
            available_quantity: 0,
            is_available: false,
          })
          continue
        }
        
        // Fire yüzdesini hesaba kat
        const firePercentage = parseFloat(item.fire_percentage) || 0
        const quantityWithFire = parseFloat(item.quantity_required) * (1 + (firePercentage / 100))
        const totalRequired = quantityWithFire * quantity
        
        // DEPO STOĞU YETERSİZSE EKLE
        if (availableStock < totalRequired) {
          insufficientItems.push({
            stock_id: item.material_id,
            stock_code: item.material_code || item.material_id,
            stock_name: item.material_name,
            stock_category: item.material_category || 
                           (item.material_name.toLowerCase().includes('kumaş') ? 'kumaş' : 
                            item.material_name.toLowerCase().includes('sünger') ? 'sünger' : 
                            item.material_name.toLowerCase().includes('ayak') ? 'ayak' : 'diğer'),
            stock_unit: item.material_unit,
            required_quantity: parseFloat(item.quantity_required),
            fire_percentage: firePercentage,
            available_quantity: availableStock,
            is_available: false,
          })
        }
      }

      // Eğer eksik malzeme varsa modal göster ve işlemi durdur - ÜRETİME ALMA
      if (insufficientItems.length > 0) {
        setStockCheck({
          allAvailable: false,
          insufficientItems: insufficientItems,
        })
        setShowInsufficientModal(true)
        setLoading(false)
        return // ÜRETİME ALMA - STOK YETERSİZ
      }

      // Tüm stoklar yeterli, üretim emrini API ile oluştur
      // API'de de stok kontrolü yapılacak (çift kontrol)
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          product_id: selectedProductId,
          quantity: quantity,
          due_date: dueDate || null,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Üretim emri oluşturulamadı')
      }

      const result = await response.json()
      alert('✅ Üretim emri oluşturuldu ve stoklar otomatik düşüldü!')
      router.push('/production')
    } catch (error: any) {
      console.error('Üretim emri oluşturulurken hata:', error)
      alert('Hata: ' + (error.message || 'Üretim emri oluşturulamadı'))
    } finally {
      setLoading(false)
    }
  }

  // Seçili siparişleri al
  const selectedOrdersList = Array.from(selectedOrderIds)
    .map(orderId => orders.find(o => o.id === orderId))
    .filter(Boolean)

  // Yardımcı fonksiyonlar
  function extractFabricCode(notes: string | null): string {
    if (!notes) return '-'
    const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
    return fabricMatch ? fabricMatch[1].trim() : '-'
  }

  function extractCase(notes: string | null): string {
    if (!notes) return '-'
    const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
    return caseMatch ? caseMatch[1].trim() : '-'
  }

  function extractLeg(notes: string | null): string {
    if (!notes) return '-'
    const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
    return legMatch ? legMatch[1].trim() : '-'
  }

  function extractDescription(notes: string | null): string {
    if (!notes) return '-'
    let desc = notes
      .replace(/Kumaş:\s*[^|]+/gi, '')
      .replace(/Kasa:\s*[^|]+/gi, '')
      .replace(/Ayak:\s*[^|]+/gi, '')
      .replace(/Birim:\s*[^|]+/gi, '')
      .replace(/\|\s*\|\s*/g, '|')
      .replace(/^\|\s*|\s*\|$/g, '')
      .trim()
    return desc || '-'
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        if (dateStr.includes('.')) {
          const parts = dateStr.split('.')
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0')
            const month = parts[1].padStart(2, '0')
            const year = parts[2]
            return `${day}.${month}.${year}`
          }
        }
        return dateStr
      }
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}.${month}.${year}`
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9]">
      <div className="mb-8">
        <Link href="/production" className="text-[#6366f1] hover:text-[#8b5cf6] mb-4 inline-block transition-colors">
          ← Geri Dön
        </Link>
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">Yeni Üretim Emri</h1>
          <LogoWithBackground size="sm" />
        </div>
        <p className="text-[#94a3b8] mt-1">Üretim emri oluşturun ve stokları otomatik düşürün</p>
      </div>

      {/* Seçili Siparişler */}
      {selectedOrdersList.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">Seçili Siparişler ({selectedOrdersList.length})</h3>
          <div className="space-y-4">
            {selectedOrdersList.map((order) => {
              if (!order) return null
              return (
                <div 
                  key={order.id} 
                  className="bg-[#1e293b] rounded-lg border border-[#334155] p-4 hover:bg-[#334155] transition-all duration-200 hover:shadow-lg"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Sol Sütun */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">TAKİP NO</div>
                      <div className="text-white text-sm font-mono">{order.order_number}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#94a3b8] mb-1">PARÇA</div>
                      <div className="text-[#f1f5f9] text-sm font-medium">{order.configuration || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#94a3b8] mb-1">Durum</div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          order.status === 'pending' ? 'bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20' :
                          order.status === 'in_production' ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20' :
                          order.status === 'completed' ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' :
                          'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'
                        }`}>
                          {order.status === 'pending' ? 'Beklemede' :
                           order.status === 'in_production' ? 'Üretimde' :
                           order.status === 'completed' ? 'Tamamlandı' : 'İptal Edildi'}
                        </span>
                      </div>
                    </div>

                    {/* Orta Sol Sütun */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">MÜŞTERİ ADI</div>
                      <div className="text-white text-sm">{order.customer_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">ÜRÜN ADI</div>
                      <div className="text-white text-sm">{order.product_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">KUMAŞ KODU</div>
                      <div className="text-white text-sm">
                        {extractFabricCode(order.notes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SKU</div>
                      <div className="text-white text-sm">{order.product_sku || '-'}</div>
                    </div>

                    {/* Orta Sağ Sütun */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">AÇIKLAMA</div>
                      <div className="text-white text-sm break-words whitespace-normal">
                        {extractDescription(order.notes)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SİP MİKTAR</div>
                      <div className="text-white text-sm">{order.quantity} ADET</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">KASA</div>
                      <div className="text-white text-sm">
                        {extractCase(order.notes)}
                      </div>
                    </div>

                    {/* Sağ Sütun */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1">SİP TRH</div>
                      <div className="text-white text-sm">{formatDate(order.order_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">CARİ ADI</div>
                      <div className="text-white text-sm">{order.dealer_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">AYAK</div>
                      <div className="text-white text-sm">
                        {extractLeg(order.notes)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6 space-y-6 shadow-xl">
        {/* Üretim Emri Bilgileri */}
        <div>
          <h2 className="text-xl font-semibold text-[#f1f5f9] mb-4 flex items-center space-x-2">
            <Factory className="w-5 h-5 text-[#6366f1]" />
            <span>Üretim Emri Bilgileri</span>
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1">
                Emir No *
              </label>
              {codeLoading ? (
                <div className="w-full px-3 py-2 border border-[#334155] rounded-lg bg-[#0f172a]">
                  <span className="text-[#64748b]">Kod oluşturuluyor...</span>
                </div>
              ) : (
                <input
                  id="production-order-number"
                  name="production-order-number"
                  type="text"
                  required
                  readOnly
                  value={orderNumber}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] text-[#f1f5f9] rounded-lg cursor-not-allowed opacity-75 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
                  placeholder="Örn: URE-001"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Miktar *
              </label>
              <input
                id="production-quantity"
                name="production-quantity"
                type="number"
                required
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Teslim Tarihi
              </label>
              <input
                id="production-due-date"
                name="production-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Ürün Seçimi - Üretim Emri Bilgileri içinde */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Koltuk Modeli *
            </label>
            {selectedOrderId ? (
              // Seçili sipariş varsa, sadece göster (okunur)
              (() => {
                const selectedOrder = orders.find(o => o.id === selectedOrderId)
                if (selectedOrder) {
                  const displayName = selectedOrder.product_name + (selectedOrder.configuration ? ` ${selectedOrder.configuration}` : '')
                  const selectedProduct = products.find(p => p.id === selectedProductId)
                  return (
                    <div className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg">
                      <div className="text-white font-medium">
                        {selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.name}` : displayName}
                        {selectedOrder.configuration && (
                          <span className="text-blue-400 ml-2">(Parça: {selectedOrder.configuration})</span>
                        )}
                      </div>
                      {selectedOrder.dealer_name && (
                        <div className="text-gray-400 text-sm mt-1">
                          Bayi: <span className="text-blue-400">{selectedOrder.dealer_name}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()
            ) : (
              // Seçili sipariş yoksa, normal dropdown göster
              <>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ürün seçin...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
                {selectedProductId && getDealerForProduct(selectedProductId, null) && (
                  <p className="mt-2 text-sm text-gray-400">
                    Bu ürün <span className="text-blue-400 font-medium">{getDealerForProduct(selectedProductId, null)}</span> bayisine ait
                  </p>
                )}
              </>
            )}
          </div>

          {/* BOM Listesi - Üretim Emri Bilgileri içinde */}
          {bomItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#f1f5f9] mb-3">
                Ürün Reçetesi
              </h3>
              <div className="bg-[#0f172a] rounded-lg border border-[#334155] overflow-hidden">
                <table className="min-w-full divide-y divide-[#334155]">
                  <thead className="bg-[#1e293b]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                        Hammadde
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                        Gereken
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                        Mevcut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Toplam Gereken
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {bomItems.map((item) => {
                      // Fire yüzdesini hesaba kat
                      const quantityWithFire = item.required_quantity * (1 + (item.fire_percentage / 100))
                      const totalRequired = quantityWithFire * quantity
                      const isAvailable = item.is_available
                      
                      return (
                        <tr key={item.stock_id} className="hover:bg-[#334155]/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-[#f1f5f9] font-medium">
                            {item.stock_name}
                            <span className="text-[#64748b] ml-2">({item.stock_code})</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#94a3b8] capitalize">
                            {item.stock_category}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {item.required_quantity} {item.stock_unit}
                            {item.fire_percentage > 0 && (
                              <span className="text-yellow-400 ml-1 text-xs">
                                (+{item.fire_percentage}% fire)
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm ${
                            isNaN(item.available_quantity) || !isAvailable 
                              ? 'text-red-400 font-semibold' 
                              : 'text-white'
                          }`}>
                            {isNaN(item.available_quantity) ? '0' : item.available_quantity.toLocaleString('tr-TR', { 
                              minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                              maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0
                            })} {item.stock_unit}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            {totalRequired.toLocaleString('tr-TR', {
                              minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                              maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0
                            })} {item.stock_unit}
                            {item.fire_percentage > 0 && (
                              <span className="text-yellow-400 ml-1 text-xs">
                                (fire dahil)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isAvailable ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Yeterli
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Yetersiz
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stok Uyarısı - Üretim Emri Bilgileri içinde */}
          {stockCheck && !stockCheck.allAvailable && (
            <div className="mb-6 bg-red-900 border border-red-700 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-300 mt-0.5" />
                <div>
                  <h3 className="text-red-300 font-semibold mb-2">Stok Yetersiz!</h3>
                  <p className="text-red-200 text-sm mb-2">
                    Aşağıdaki hammaddeler yetersiz:
                  </p>
                  <ul className="list-disc list-inside text-red-200 text-sm space-y-1">
                    {stockCheck.insufficientItems.map((item) => (
                      <li key={item.stock_id}>
                        {item.stock_name}: Gereken {item.required_quantity * quantity} {item.stock_unit}, 
                        Mevcut {item.available_quantity} {item.stock_unit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Başarı Mesajı - Üretim Emri Bilgileri içinde */}
          {stockCheck && stockCheck.allAvailable && bomItems.length > 0 && (
            <div className="mb-6 bg-green-900 border border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-300" />
                <p className="text-green-300 font-medium">
                  Tüm hammaddeler yeterli. Üretimi başlatabilirsiniz.
                </p>
              </div>
            </div>
          )}

          {/* Butonlar - Üretim Emri Bilgileri içinde */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Link
              href="/production"
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white"
            >
              İptal
            </Link>
            <button
              onClick={handleStartProduction}
              disabled={
                loading || 
                (selectedOrderIds.size === 0 && (!selectedProductId || quantity <= 0))
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>İşleniyor...</span>
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  <span>Üretimi Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* BOM Kontrolü Modal - Seçili Siparişler */}
      <Modal
        isOpen={showBOMCheckModal}
        onClose={() => {
          setShowBOMCheckModal(false)
          setBomCheckResults([])
        }}
        title="Reçete ve Stok Kontrolü"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-300 font-semibold mb-2">
                  Seçili Siparişlerin Reçete ve Stok Kontrolü
                </h3>
                <p className="text-blue-200 text-sm">
                  Aşağıda seçili siparişlerin reçete (BOM) ve stok durumları gösterilmektedir. 
                  Stoklar yetersiz olan siparişler üretime alınamaz.
                </p>
              </div>
            </div>
          </div>

          {bomCheckResults.map((result, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className={`p-4 border-b border-gray-700 ${result.all_available ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">{result.order_number}</h4>
                    <p className="text-gray-400 text-sm">{result.product_name}</p>
                  </div>
                  {result.all_available && result.bom_items.length > 0 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Stoklar Yeterli
                    </span>
                  ) : result.bom_items.length === 0 ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Reçete Bulunamadı
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Stok Yetersiz
                    </span>
                  )}
                </div>
              </div>
              
              {result.bom_items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-750">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Kod</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Hammadde</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Gereken</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Mevcut</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Toplam Gereken</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {result.bom_items.map((item) => {
                        const quantityWithFire = item.required_quantity * (1 + (item.fire_percentage / 100))
                        // Sipariş miktarını bul
                        const order = orders.find(o => o.order_number === result.order_number)
                        const orderQuantity = order?.quantity || 1
                        const totalRequired = quantityWithFire * orderQuantity
                        const isAvailable = item.is_available
                        
                        return (
                          <tr key={item.stock_id} className="hover:bg-gray-750">
                            <td className="px-4 py-2 text-sm text-white font-medium">
                              {item.stock_code || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-white">
                              {item.stock_name}
                              {item.fire_percentage > 0 && (
                                <span className="text-yellow-400 ml-1 text-xs">
                                  (+{item.fire_percentage}% fire)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-white">
                              {item.required_quantity} {item.stock_unit}
                            </td>
                            <td className={`px-4 py-2 text-sm ${!isAvailable ? 'text-red-400 font-semibold' : 'text-white'}`}>
                              {item.available_quantity.toLocaleString('tr-TR', {
                                minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                                maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0
                              })} {item.stock_unit}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-white">
                              {totalRequired.toLocaleString('tr-TR', {
                                minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                                maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0
                              })} {item.stock_unit}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {isAvailable ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Yeterli
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Yetersiz
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  Bu sipariş için reçete (BOM) bulunamadı.
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={() => {
                setShowBOMCheckModal(false)
                setBomCheckResults([])
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Kapat
            </button>
            {bomCheckResults.every(r => r.all_available && r.bom_items.length > 0) && (
              <button
                onClick={async () => {
                  setShowBOMCheckModal(false)
                  if (!confirm(`${selectedOrderIds.size} siparişten üretim emri oluşturmak istediğinize emin misiniz?`)) {
                    return
                  }
                  
                  setConverting(true)
                  try {
                    const response = await fetch('/api/orders/convert-to-production', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        order_ids: Array.from(selectedOrderIds),
                        due_date: dueDate || null // Frontend'deki teslim tarihini gönder
                      })
                    })
                    
                    if (!response.ok) {
                      const error = await response.json()
                      let errorMsg = error.error || error.message || 'Dönüştürme başarısız'
                      if (error.details && Array.isArray(error.details)) {
                        errorMsg += `\n\n❌ Hatalar (${error.details.length} adet):\n${error.details.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}`
                      }
                      throw new Error(errorMsg)
                    }

                    const result = await response.json()
                    let alertMessage = result.message || 'İşlem tamamlandı'
                    
                    if (result.skipped_orders && result.skipped_orders.length > 0) {
                      alertMessage += `\n\n⚠️ Atlanan siparişler:\n${result.skipped_orders.join('\n')}`
                    }
                    
                    if (result.errors && result.errors.length > 0) {
                      alertMessage += `\n\n❌ Hatalar:\n${result.errors.join('\n')}`
                    }
                    
                    alert(alertMessage)
                    setSelectedOrderIds(new Set())
                    setBomCheckResults([])
                    router.push('/production')
                  } catch (error: any) {
                    alert('Hata: ' + error.message)
                  } finally {
                    setConverting(false)
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white rounded-lg hover:from-[#16a34a] hover:to-[#15803d] transition-all duration-200 hover:shadow-lg font-medium"
              >
                Üretim Emri Oluştur
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Eksik Malzeme Modal */}
      <Modal
        isOpen={showInsufficientModal}
        onClose={() => setShowInsufficientModal(false)}
        title="Eksik Malzeme Listesi"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">
                  Stok Yetersiz - Üretim Başlatılamadı!
                </h3>
                <p className="text-red-200 text-sm">
                  Aşağıdaki hammaddeler üretim miktarı için yetersiz. Lütfen stokları kontrol edin veya üretim miktarını azaltın.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Hammadde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Birim
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Gereken
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Mevcut
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                    Eksik
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stockCheck?.insufficientItems.map((item) => {
                  const totalRequired = item.required_quantity * quantity
                  const shortage = totalRequired - item.available_quantity
                  
                  return (
                    <tr key={item.stock_id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {item.stock_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {item.stock_unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-white text-right">
                        {totalRequired.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 text-right">
                        {item.available_quantity.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-400 font-semibold text-right">
                        {shortage.toLocaleString('tr-TR', {
                          minimumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                          maximumFractionDigits: item.stock_unit === 'metre' ? 2 : 0,
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowInsufficientModal(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Kapat
            </button>
            <Link
              href="/inventory/materials"
              onClick={() => setShowInsufficientModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Stok Yönetimine Git
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  )
}
