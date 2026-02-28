'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Package,
    Search,
    Save,
    Image as ImageIcon,
    DollarSign,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    LayoutGrid,
    Loader2
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface Product {
    id: string
    name: string
    sku: string
    price: number
    selling_price: number
    dealer_price: number
    image_url: string | null
}

export default function B2BCatalogManagementPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [savingId, setSavingId] = useState<string | null>(null)
    const [uploadingId, setUploadingId] = useState<string | null>(null)

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true)
            // Sadece BOM (reçetesi) olan ürünleri getir
            const data = await fetchApi('/api/products?has_bom=true')
            if (Array.isArray(data)) {
                setProducts(data)
            }
        } catch (error) {
            console.error('Error loading products:', error)
            toast.error('Ürünler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    const handleUpdate = async (product: Product) => {
        try {
            setSavingId(product.id)
            const res = await fetch(`/api/products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dealer_price: Number(product.dealer_price),
                    image_url: product.image_url
                })
            })

            if (!res.ok) throw new Error('Güncelleme başarısız')

            toast.success(`${product.name} güncellendi`)
        } catch (error) {
            console.error('Error updating product:', error)
            toast.error('Güncelleme sırasında hata oluştu')
        } finally {
            setSavingId(null)
        }
    }

    const handleImageUpload = async (productId: string, file: File) => {
        try {
            setUploadingId(productId)
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız')

            // Update local state with the new image URL
            handleInputChange(productId, 'image_url', data.url)
            toast.success('Görsel yüklendi. Kaydetmeyi unutmayın.')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Görsel yüklenirken hata oluştu')
        } finally {
            setUploadingId(null)
        }
    }

    const handleInputChange = (id: string, field: keyof Product, value: any) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <AppDashboardLayout
            title="B2B Katalog Yönetimi"
            subtitle="Bayi portalında görünen ürün fiyatlarını ve görsellerini yönetin"
            icon={LayoutGrid}
        >
            <div className="space-y-6">
                {/* Search and Filters */}
                <Card>
                    <CardBody className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Ürün adı veya SKU ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge color="primary" variant="soft">
                                    {filteredProducts.length} Ürün Listeleniyor
                                </Badge>
                                <Badge color="warning" variant="outline" className="hidden sm:flex">
                                    Sadece BOM'lu Ürünler
                                </Badge>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p>Ürünler yükleniyor...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <Card>
                        <CardBody className="py-20 flex flex-col items-center justify-center text-gray-500">
                            <Package className="w-12 h-12 mb-4 opacity-20" />
                            <p>Aradığınız kriterlerde ürün bulunamadı veya reçeteli (BOM) ürün yok.</p>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredProducts.map(product => (
                            <Card key={product.id} className="overflow-hidden hover:border-blue-500/50 transition-colors">
                                <CardBody className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Product Image Preview */}
                                        <div className="w-full md:w-48 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 relative">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-40 md:h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://placehold.co/400x300/1f2937/a3e635?text=Hata`
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center p-6 text-gray-400">
                                                    <ImageIcon className="w-8 h-8 mb-2" />
                                                    <span className="text-xs text-center">Görsel Yok</span>
                                                </div>
                                            )}

                                            {/* Local Upload Overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-colors">
                                                    <ImageIcon className="w-6 h-6 text-white" />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) handleImageUpload(product.id, file)
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            {uploadingId === product.id && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Details & Actions */}
                                        <div className="flex-1 p-6">
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg">{product.name}</h3>
                                                        <Badge variant="outline" size="sm">{product.sku}</Badge>
                                                    </div>
                                                    <div className="flex flex-wrap gap-4 text-sm mt-2">
                                                        <div className="text-gray-500">
                                                            Piyasa: <span className="text-gray-900 dark:text-gray-100 font-medium font-mono">₺{product.selling_price || product.price}</span>
                                                        </div>
                                                        <div className="text-blue-500 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                                            Mevcut Bayi Fiyatı: <span className="font-mono">₺{product.dealer_price || (product.selling_price * 0.85).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-end gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                                                    <div className="space-y-1.5 flex-1 min-w-[150px]">
                                                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1 uppercase tracking-tight">
                                                            <DollarSign className="w-3 h-3" /> Bayi Fiyatı (₺)
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={product.dealer_price || 0}
                                                            onChange={(e) => handleInputChange(product.id, 'dealer_price', e.target.value)}
                                                            className="h-10 border-blue-200/50 dark:border-blue-500/20 focus:border-blue-500 font-mono"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                                                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1 uppercase tracking-tight">
                                                            <ImageIcon className="w-3 h-3" /> Görsel URL / Dosya
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={product.image_url || ''}
                                                                placeholder="https://... veya dosya yükle"
                                                                onChange={(e) => handleInputChange(product.id, 'image_url', e.target.value)}
                                                                className="h-10"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-10 w-10 shrink-0 border-dashed"
                                                                onClick={() => {
                                                                    // Hidden input trigger or handled via overlay
                                                                    const input = document.createElement('input')
                                                                    input.type = 'file'
                                                                    input.accept = 'image/*'
                                                                    input.onchange = (e) => {
                                                                        const file = (e.target as any).files?.[0]
                                                                        if (file) handleImageUpload(product.id, file)
                                                                    }
                                                                    input.click()
                                                                }}
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="solid"
                                                        color="primary"
                                                        className="h-10 px-8 shrink-0 shadow-lg shadow-blue-500/20"
                                                        onClick={() => handleUpdate(product)}
                                                        disabled={savingId === product.id}
                                                    >
                                                        {savingId === product.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4 mr-2" />
                                                        )}
                                                        Kaydet
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppDashboardLayout>
    )
}
