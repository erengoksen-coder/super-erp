'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus, Search, Trash2, CheckCircle2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { cn } from '@/lib/cn'

type CatalogProduct = {
  id: string
  name: string
  sku: string
  base_price: number
  dealer_price: number
  image_url: string
}

type CartItem = CatalogProduct & { quantity: number }

export default function BayiCatalogPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Cart Store usage
  const cart = useCartStore(s => s.cart)
  const addToStore = useCartStore(s => s.addToCart)
  const removeFromStore = useCartStore(s => s.removeFromCart)
  const updateQuantityStore = useCartStore(s => s.updateCartQuantity)
  const clearCart = useCartStore(s => s.clearCart)
  const getCartTotal = useCartStore(s => s.getCartTotal)

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [includeKDV, setIncludeKDV] = useState(false)
  const [checkoutQueue, setCheckoutQueue] = useState<CartItem[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)

  const getCurrentDateTimeLocal = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  const [newOrder, setNewOrder] = useState({
    order_number: '',
    customer_name: '',
    product_name: '',
    product_sku: '',
    quantity: 1,
    unit_price: 0,
    base_price: 0,
    order_date: getCurrentDateTimeLocal(),
    configuration: '',
    fabric_code: '',
    case_info: '',
    leg_info: '',
    cushion_info: '',
    unit: '',
    notes: ''
  })
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [filteredProductsInput, setFilteredProductsInput] = useState<CatalogProduct[]>([])

  const [materials, setMaterials] = useState<Array<{ id: string; code: string; name: string; category: string }>>([])
  const [showFabricSuggestions, setShowFabricSuggestions] = useState(false)
  const [filteredFabrics, setFilteredFabrics] = useState<Array<{ id: string; code: string; name: string; category: string }>>([])
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1)
  const [highlightedFabricIndex, setHighlightedFabricIndex] = useState(-1)

  useEffect(() => {
    if (isManualModalOpen) {
      setFilteredProductsInput(products)

      fetchApi('/api/materials').then((res: any) => {
        const matData = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : [])
        // Sadece kategori adında Kumaş vb geçenleri de alabiliriz veya tamamını
        setMaterials(matData)
        setFilteredFabrics(matData)
      }).catch(() => { setMaterials([]); setFilteredFabrics([]); })
    }
  }, [isManualModalOpen])

  function findSkuByProductName(productName: string): string | null {
    const n = (productName || '').trim().toLowerCase()
    if (!n || products.length === 0) return null
    let found = products.find((p) => {
      const name = (p.name || '').trim()
      const display = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ').trim().toLowerCase() : name.toLowerCase()
      return name.toLowerCase() === n || display === n
    })
    if (found) return found.sku
    found = products.find((p) => {
      const name = (p.name || '').trim().toLowerCase()
      const display = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ').trim().toLowerCase() : name
      return display.includes(n) || n.includes(display) || name.includes(n)
    })
    return found ? found.sku : null
  }

  function handleFabricChange(value: string) {
    setNewOrder({ ...newOrder, fabric_code: value })
    if (!value.trim()) {
      setFilteredFabrics(materials)
    } else {
      const search = value.toLowerCase()
      setFilteredFabrics(materials.filter(m =>
        (m.name || '').toLowerCase().includes(search) || (m.code || '').toLowerCase().includes(search)
      ))
    }
    setShowFabricSuggestions(true)
    setHighlightedFabricIndex(-1)
  }

  function handleFabricKeyDown(e: React.KeyboardEvent) {
    if (!showFabricSuggestions || filteredFabrics.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedFabricIndex(prev => (prev + 1) % filteredFabrics.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedFabricIndex(prev => (prev - 1 + filteredFabrics.length) % filteredFabrics.length)
    } else if (e.key === 'Enter') {
      if (highlightedFabricIndex >= 0) {
        e.preventDefault()
        const mat = filteredFabrics[highlightedFabricIndex]
        setNewOrder({ ...newOrder, fabric_code: mat.name })
        setShowFabricSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowFabricSuggestions(false)
    }
  }

  function handleProductChange(value: string) {
    setNewOrder((prev) => ({ ...prev, product_name: value, product_sku: '', unit_price: 0, base_price: 0 }))
    if (!value.trim()) {
      setFilteredProductsInput(products)
    } else {
      const search = value.toLowerCase()
      setFilteredProductsInput(products.filter(p =>
        (p.name || '').toLowerCase().includes(search) || (p.sku || '').toLowerCase().includes(search)
      ))
    }
    setShowProductSuggestions(true)
    setHighlightedProductIndex(-1)
  }

  function handleProductKeyDown(e: React.KeyboardEvent) {
    if (!showProductSuggestions || filteredProductsInput.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedProductIndex(prev => (prev + 1) % filteredProductsInput.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedProductIndex(prev => (prev - 1 + filteredProductsInput.length) % filteredProductsInput.length)
    } else if (e.key === 'Enter') {
      if (highlightedProductIndex >= 0) {
        e.preventDefault()
        const prod = filteredProductsInput[highlightedProductIndex]
        setNewOrder({ ...newOrder, product_name: prod.name, product_sku: prod.sku, base_price: prod.base_price, unit_price: prod.dealer_price })
        setShowProductSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowProductSuggestions(false)
    }
  }

  // Fetch catalog
  useEffect(() => {
    fetchApi('/api/bayi/catalog')
      .then((res: any) => {
        setProducts(Array.isArray(res) ? res : (res?.data || []))
      })
      .catch(() => toast.error('Katalog yüklenirken hata oluştu'))
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: CatalogProduct) => {
    addToStore(product)
    toast.success(`${product.name} sepete eklendi`)
  }

  const submitManualOrder = async () => {
    if (!newOrder.product_name || !newOrder.fabric_code) {
      toast.error('Ürün Adı ve Kumaş Kodu bilgileri zorunludur.')
      return
    }

    // BOM/Katalog Ürün Kontrolü
    const sku = newOrder.product_sku || findSkuByProductName(newOrder.product_name)
    if (!sku) {
      toast.error('Girdiğiniz ürün sistemde (BOM) kayıtlı görünmüyor. Lütfen ürünü listeden seçiniz.')
      return
    }

    // Depoda Olmayan Kumaş Yazılamasın Kontrolü
    if (newOrder.fabric_code) {
      const fabricExists = materials.some(m => (m.name || '').toLowerCase() === newOrder.fabric_code.trim().toLowerCase() || (m.code || '').toLowerCase() === newOrder.fabric_code.trim().toLowerCase())
      if (!fabricExists && materials.length > 0) {
        toast.error('Girdiğiniz kumaş depoda bulunmamaktadır. Lütfen listeden seçiniz.')
        return
      }
    }

    const payload = {
      ...newOrder,
      product_sku: sku,
      case_info: (newOrder.case_info || '').trim() || 'KATALOG',
      leg_info: (newOrder.leg_info || '').trim() || 'KATALOG',
      cushion_info: (newOrder.cushion_info || '').trim() || 'KATALOG',
      includeKDV: includeKDV
    }

    setSubmitting(true)
    try {
      const res = await fetchApi('/api/bayi/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (res as any)?.data ?? res
      if (data?.success) {
        if (checkoutQueue.length > 1 && currentQueueIndex < checkoutQueue.length - 1) {
          toast.success(`${currentQueueIndex + 1}/${checkoutQueue.length} Ürün kaydedildi. Lütfen sıradaki ürün detaylarını girin.`)
          const nextIndex = currentQueueIndex + 1
          setCurrentQueueIndex(nextIndex)
          const nextItem = checkoutQueue[nextIndex]
          setNewOrder(prev => ({
            ...prev,
            product_name: nextItem.name,
            product_sku: nextItem.sku,
            base_price: nextItem.base_price,
            unit_price: nextItem.dealer_price,
            quantity: nextItem.quantity,
            fabric_code: '',
            case_info: '',
            leg_info: '',
            cushion_info: '',
            notes: ''
          }))
          // Modal continues open for next item
        } else {
          toast.success('Sipariş(ler)iniz başarıyla oluşturuldu.')
          clearCart()
          setIsManualModalOpen(false)
          router.push('/bayi/orders')
        }
      } else {
        toast.error((data as any)?.error || 'Bir sorun oluştu.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Sipariş verilirken hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateCartQuantity = (id: string, delta: number) => {
    updateQuantityStore(id, delta)
  }

  const removeFromCart = (id: string) => {
    removeFromStore(id)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    const queue = [...cart]
    setCheckoutQueue(queue)
    setCurrentQueueIndex(0)

    const firstItem = queue[0]
    setNewOrder({
      ...newOrder,
      product_name: firstItem.name,
      product_sku: firstItem.sku,
      base_price: firstItem.base_price,
      unit_price: firstItem.dealer_price,
      quantity: firstItem.quantity
    })
    setIsCartOpen(false)
    setIsManualModalOpen(true)
  }

  return (
    <div className="space-y-6 relative h-full">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Ürün Kataloğu
          </h2>
          <p className="text-slate-400 text-sm">Size özel iskonto oranlarıyla anında sipariş oluşturun.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ürün Ara (Ad veya SKU)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors border border-slate-600"
          >
            <Plus className="w-4 h-4" />
            <span>Elle Sipariş Gir</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg relative transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Sepetim</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-slate-800/50 rounded-xl h-72 border border-slate-700"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/40 rounded-xl border border-slate-700/60 text-slate-400">
          Kriterlerinize uygun ürün bulunamadı.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="group bg-slate-800/80 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
              onDoubleClick={() => setLightboxImage(product.image_url)}
            >
              {/* Product Image mockup */}
              <div className="h-48 bg-slate-700 flex items-center justify-center overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-white font-medium line-clamp-1" title={product.name}>{product.name}</h3>
                  <p className="text-sm text-slate-400">{product.sku}</p>
                </div>

                <div className="flex flex-col gap-0.5">
                  {product.base_price > 0 && product.base_price > product.dealer_price && (
                    <span className="text-base font-bold text-slate-200 line-through decoration-red-500 decoration-[3px]">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.base_price)}
                    </span>
                  )}
                  <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.dealer_price || 0)}
                  </span>
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="w-full py-2 flex items-center justify-center gap-2 bg-slate-700 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Sepete Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer (Offcanvas) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 h-full border-l border-slate-700 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
                Sepetiniz
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Sepetiniz şu an boş.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700/60">
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded object-cover" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="pr-2">
                          <p className="text-sm font-medium text-white line-clamp-1">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.sku}</p>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400 mt-0.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mt-2">
                        <div className="flex items-center gap-2 bg-slate-900 rounded-md border border-slate-700">
                          <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-white">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm text-white font-medium w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-white">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-green-400">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.dealer_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-700 mt-auto bg-slate-900/90 pb-2">
                <div
                  onClick={() => setIncludeKDV(!includeKDV)}
                  className={cn(
                    "flex items-center justify-between p-4 my-3 rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden relative group",
                    includeKDV
                      ? "bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]"
                      : "bg-slate-800/60 border-slate-700 hover:border-slate-500"
                  )}>
                  {/* Decorative background light */}
                  <div className={cn(
                    "absolute -right-10 -top-10 w-24 h-24 blur-2xl rounded-full transition-opacity duration-500",
                    includeKDV ? "bg-blue-500/20 opacity-100" : "bg-slate-500/5 opacity-0"
                  )} />

                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-lg",
                      includeKDV
                        ? "bg-blue-500/30 border-blue-400/40 text-blue-300"
                        : "bg-slate-700 border-slate-600 text-slate-400"
                    )}>
                      <span className="text-xs font-black">%20</span>
                    </div>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[15px] font-black tracking-tight uppercase transition-colors duration-500",
                        includeKDV ? "text-white" : "text-slate-300 group-hover:text-white"
                      )}>
                        KDV Hesapla
                      </span>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors duration-500",
                        includeKDV ? "text-blue-400" : "text-slate-500"
                      )}>
                        {includeKDV ? "VERGİ DAHİL EDİLDİ" : "VERGİ HARİÇ"}
                      </span>
                    </div>
                  </div>

                  <div className={cn(
                    "w-14 h-7 rounded-full transition-all duration-500 relative flex items-center px-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border",
                    includeKDV
                      ? "bg-blue-500 border-blue-400"
                      : "bg-slate-700 border-slate-600 group-hover:bg-slate-600"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-full transition-all duration-500 shadow-xl flex items-center justify-center transform",
                      includeKDV
                        ? "translate-x-7 bg-white scale-110"
                        : "translate-x-0 bg-slate-300"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                        includeKDV ? "bg-blue-600 animate-pulse" : "bg-slate-500"
                      )} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-slate-300 mb-2">
                  <span>Ara Toplam</span>
                  <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(getCartTotal())}</span>
                </div>
                {includeKDV && (
                  <div className="flex justify-between text-slate-300 mb-4">
                    <span>KDV (%20)</span>
                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(getCartTotal() * 0.20)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white text-lg font-bold mb-6">
                  <span>Genel Toplam</span>
                  <span className="text-blue-400">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(includeKDV ? getCartTotal() * 1.20 : getCartTotal())}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'İşleniyor...' : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Siparişi Tamamla
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yeni Sipariş Oluşturma Modal (ERP Clone) */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] overflow-y-auto p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  Yeni Sipariş Oluştur
                  {checkoutQueue.length > 1 && (
                    <span className="ml-3 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                      Ürün {currentQueueIndex + 1} / {checkoutQueue.length}
                    </span>
                  )}
                </h2>
                <p className="text-slate-400 text-sm mt-1">Sipariş detaylarını eksiksiz doldurun.</p>
              </div>
              <button type="button" onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center border border-slate-700">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form className="space-y-5" onSubmit={e => { e.preventDefault(); submitManualOrder(); }}>
                {/* İlk Satır: TAKİP NO ve SİP TRH */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">TAKİP NO (Sipariş No)</label>
                    <input
                      type="text"
                      value={newOrder.order_number}
                      onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Otomatik oluşturulacak"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SİP TRH (Sipariş Tarihi + Saati) <span className="text-red-400">*</span></label>
                    <input
                      type="datetime-local"
                      value={newOrder.order_date}
                      onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* İkinci Satır: CARİ ADI ve MÜŞTERİ ADI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">CARİ ADI (Bayi Adı) <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={(user as any)?.dealer_name || (user as any)?.name || (user as any)?.id || 'Bayi'}
                      disabled
                      className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">MÜŞTERİ ADI (Satın Alan Müşteri)</label>
                    <input
                      type="text"
                      value={newOrder.customer_name}
                      onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Müşteri adını girin..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Müşteri Kodu <span className="text-xs text-slate-500 font-normal normal-case inline-block ml-1">(Otomatik oluşturulacak)</span></label>
                    <input type="text" disabled placeholder="Otomatik oluşturulacak" className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 cursor-not-allowed" />
                  </div>
                </div>

                {/* Ürün Bilgileri Satırı */}
                <div className="p-5 border border-slate-700/60 rounded-xl bg-slate-800/20 space-y-4 shadow-sm">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">ÜRÜN ADI <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={newOrder.product_name}
                        onChange={(e) => handleProductChange(e.target.value)}
                        onKeyDown={handleProductKeyDown}
                        onFocus={() => setShowProductSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Ürün adı arayın..."
                        required
                      />
                      {showProductSuggestions && newOrder.product_name.trim().length > 0 && filteredProductsInput.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {filteredProductsInput.map((prod, index) => (
                            <div
                              key={prod.id}
                              onMouseEnter={() => setHighlightedProductIndex(index)}
                              onClick={() => {
                                setNewOrder({ ...newOrder, product_name: prod.name, product_sku: prod.sku, base_price: prod.base_price, unit_price: prod.dealer_price })
                                setShowProductSuggestions(false)
                              }}
                              className={cn(
                                "px-3 py-2 border-b border-slate-700/50 cursor-pointer text-white text-sm last:border-0 transition-colors",
                                highlightedProductIndex === index ? "bg-blue-600" : "hover:bg-slate-700"
                              )}
                            >
                              <div className="font-semibold">{prod.name}</div>
                              <div className="text-xs text-slate-400 group-hover:text-blue-200">{prod.sku}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showProductSuggestions && newOrder.product_name.trim().length > 0 && filteredProductsInput.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl px-3 py-2 text-red-400 text-sm">
                          Bu ürün sistemde (BOM) kayıtlı değil.
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SKU / Ürün Kodu</label>
                      <input
                        type="text"
                        value={newOrder.product_sku}
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed transition-colors"
                        placeholder="Ürün seçildiğinde otomatik gelir"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">SİP MİKTAR (Miktar) <span className="text-red-400">*</span></label>
                      <input
                        type="number"
                        min="1"
                        value={newOrder.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewOrder({ ...newOrder, quantity: val === '' ? '' as any : parseInt(val) });
                        }}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Liste Fiyatı</label>
                      <input
                        type="text"
                        disabled
                        value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(newOrder.base_price || 0)}
                        className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-400 cursor-not-allowed line-through"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-blue-400">İskontolu Fiyat (₺)</label>
                      <input
                        type="text"
                        disabled
                        value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(newOrder.unit_price || 0)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono bg-blue-500/10 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Toplam Tutar {includeKDV && <span className="text-blue-400">(KDV Dahil)</span>}
                      </label>
                      <input
                        type="text"
                        disabled
                        value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format((newOrder.quantity || 1) * (newOrder.unit_price || 0) * (includeKDV ? 1.20 : 1))}
                        className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-green-400 font-bold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">KONFİGÜRASYON</label>
                      <input
                        type="text"
                        value={newOrder.configuration}
                        onChange={(e) => setNewOrder({ ...newOrder, configuration: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">KUMAŞ KODU VEYA ADI <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={newOrder.fabric_code}
                        onChange={(e) => handleFabricChange(e.target.value)}
                        onKeyDown={handleFabricKeyDown}
                        onFocus={() => setShowFabricSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFabricSuggestions(false), 200)}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Kumaş arayın..."
                        required
                      />
                      {showFabricSuggestions && newOrder.fabric_code.trim().length > 0 && filteredFabrics.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {filteredFabrics.map((mat, index) => (
                            <div
                              key={mat.id}
                              onMouseEnter={() => setHighlightedFabricIndex(index)}
                              onClick={() => {
                                setNewOrder({ ...newOrder, fabric_code: mat.name })
                                setShowFabricSuggestions(false)
                              }}
                              className={cn(
                                "px-3 py-2 border-b border-slate-700/50 cursor-pointer text-white text-sm last:border-0 transition-colors",
                                highlightedFabricIndex === index ? "bg-blue-600" : "hover:bg-slate-700"
                              )}
                            >
                              <div className="font-semibold">{mat.name}</div>
                              <div className="text-xs text-slate-400 group-hover:text-blue-200">{mat.code}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {showFabricSuggestions && newOrder.fabric_code.trim().length > 0 && filteredFabrics.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl px-3 py-2 text-red-400 text-sm">
                          Bu kumaş depoda bulunmamaktadır.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">KASA</label>
                      <input type="text" value={newOrder.case_info} onChange={(e) => setNewOrder({ ...newOrder, case_info: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Boş ise KATALOG" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AYAK</label>
                      <input type="text" value={newOrder.leg_info} onChange={(e) => setNewOrder({ ...newOrder, leg_info: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Boş ise KATALOG" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">KİRLENT</label>
                      <input type="text" value={newOrder.cushion_info} onChange={(e) => setNewOrder({ ...newOrder, cushion_info: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="Boş ise KATALOG" />
                    </div>
                  </div>

                </div>

                {/* Notlar */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AÇIKLAMA (Notlar)</label>
                  <textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    rows={3}
                    placeholder="Ek notlar ve açıklamalar..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 font-bold disabled:opacity-50"
                  >
                    {submitting ? 'Kaydediliyor...' : (
                      checkoutQueue.length > 1 && currentQueueIndex < checkoutQueue.length - 1
                        ? 'Sıradaki Ürüne Geç →'
                        : 'Siparişi Tamamla'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-full flex items-center justify-center">
            <img
              src={lightboxImage}
              alt="Büyük Görünüm"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            />
            <button
              className="absolute -top-12 right-0 text-white hover:text-blue-400 transition-colors flex items-center gap-2 font-bold"
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            >
              KAPAT ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}