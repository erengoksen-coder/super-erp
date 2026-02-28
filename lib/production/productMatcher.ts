import { fetchApi } from '@/lib/api/client'

export interface Product {
  id: string
  sku: string
  name: string
}

export interface Order {
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

/**
 * Ürün adından SKU ve temizleme işlemleri yapar
 * Örn: "PRD-127652 - ATLAS ÜÇLÜ" -> "ATLAS ÜÇLÜ"
 */
export const extractProductName = (fullName: string): string => {
  if (!fullName) return ''
  // " - " ile ayrılmış kısımları kontrol et
  if (fullName.includes(' - ')) {
    const parts = fullName.split(' - ')
    // Son kısmı al (genellikle ürün adı)
    return parts[parts.length - 1].trim()
  }
  // SKU formatını kontrol et (PRD-XXXXX ile başlayan)
  const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
  if (skuMatch) {
    return skuMatch[1].trim()
  }
  return fullName.trim()
}

/**
 * Aday ürünler arasından reçetesi (BOM) olan ilk ürünü bulur
 */
export const findProductWithBom = async (candidates: Product[]): Promise<Product | null> => {
  for (const candidate of candidates) {
    try {
      const bomData = await fetchApi<any[]>(`/api/bom?product_id=${candidate.id}`)
      if (Array.isArray(bomData) && bomData.length > 0) {
        return candidate
      }
      console.log(`[BOM Kontrolü] ${candidate.name} (${candidate.id}) için BOM bulunamadı`)
    } catch (error) {
      console.warn(`[Ürün Eşleştirme] BOM kontrolü başarısız: ${candidate.id}`, error)
    }
  }
  return null
}

/**
 * Verilen ürün ID'si için BOM bulunamazsa, isim benzerliğine göre alternatif ürün bulur
 */
export const resolveBomProductId = async (productId: string, allProducts: Product[]): Promise<string> => {
  if (!productId) return ''

  try {
    const bomData = await fetchApi<any[]>(`/api/bom?product_id=${productId}`)
    if (Array.isArray(bomData) && bomData.length > 0) {
      return productId
    }
  } catch (error) {
    console.warn(`[BOM Eşleştirme] Direkt BOM kontrolü başarısız: ${productId}`, error)
  }

  if (allProducts.length > 0) {
    const baseProduct = allProducts.find(p => p.id === productId)
    if (!baseProduct) return productId

    const productNameOnly = extractProductName(baseProduct.name)
    
    // Aynı isimli ürün adayları
    const sameNameCandidates = allProducts.filter(p => {
      if (p.id === productId) return false
      return extractProductName(p.name).toLowerCase().trim() === productNameOnly.toLowerCase().trim()
    })

    if (sameNameCandidates.length > 0) {
      const withBom = await findProductWithBom(sameNameCandidates)
      if (withBom) return withBom.id
    }

    // Kısmi eşleşme adayları
    if (productNameOnly) {
      const partialMatches = allProducts.filter(p => {
        if (p.id === productId) return false
        const pNameLower = (p.name || '').toLowerCase()
        const searchNameLower = productNameOnly.toLowerCase()
        return pNameLower.includes(searchNameLower) || searchNameLower.includes(pNameLower)
      })

      if (partialMatches.length > 0) {
        const withBom = await findProductWithBom(partialMatches)
        if (withBom) return withBom.id
      }
    }
  }

  return productId
}

/**
 * Bir siparişi en uygun ürünle eşleştirir
 */
export const matchOrderToProduct = async (
  order: Order, 
  allProducts: Product[]
): Promise<{ productId: string; foundProduct: Product | null }> => {
  let foundProduct: Product | null = null

  // 1. Ürün adı + konfigürasyon kombinasyonuna göre bul (en spesifik)
  if (order.product_name && order.configuration) {
    const productNameLower = order.product_name.toLowerCase().trim()
    const configLower = order.configuration.toLowerCase().trim()
    
    const productBaseName = productNameLower
      .replace(/\([^)]*\)/g, '')
      .trim()
      .split(' ')[0]
      .trim()
    
    let configKeyword = ''
    if (configLower.includes('berjer')) configKeyword = 'berjer'
    else if (configLower.includes('üçlü') || configLower.includes('uclu') || configLower.includes('triple')) configKeyword = 'üçlü'
    else if (configLower.includes('köşe') || configLower.includes('kose') || configLower.includes('corner')) configKeyword = 'köşe'
    else if (configLower.includes('ikili') || configLower.includes('double') || configLower.includes('duo')) configKeyword = 'ikili'

    if (configKeyword) {
      const expectedProductName = `${productBaseName} ${configKeyword}`.toLowerCase()
      const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)
      
      // Tam eşleşme
      foundProduct = allProducts.find(p => {
        const pNameLower = p.name.toLowerCase().trim()
        const isExactMatch = pNameLower === expectedProductName
        const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
        return isExactMatch && !hasOtherConfig
      }) || null
      
      // Kısmi eşleşme
      if (!foundProduct) {
        const matchingProducts = allProducts.filter(p => {
          const pNameLower = p.name.toLowerCase().trim()
          const hasBaseName = pNameLower.includes(productBaseName)
          const hasConfigKeyword = pNameLower.includes(configKeyword)
          const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
          return hasBaseName && hasConfigKeyword && !hasOtherConfig
        })
        
        if (matchingProducts.length > 1) {
          const productWithBom = await findProductWithBom(matchingProducts)
          if (productWithBom) {
            foundProduct = productWithBom
          } else {
            matchingProducts.sort((a, b) => {
              const aNum = parseInt(a.sku.replace(/[^0-9]/g, '')) || 0
              const bNum = parseInt(b.sku.replace(/[^0-9]/g, '')) || 0
              return bNum - aNum
            })
            foundProduct = matchingProducts[0]
          }
        } else if (matchingProducts.length === 1) {
          foundProduct = matchingProducts[0]
        }
      }
    }
  }

  // 2. product_id fallback
  if (!foundProduct && order.product_id) {
    const productById = allProducts.find(p => p.id === order.product_id)
    if (productById) {
      if (!order.configuration) {
        foundProduct = productById
      } else {
        const productNameLower = productById.name.toLowerCase()
        const configLower = order.configuration.toLowerCase()
        const hasConfigMatch = (configLower.includes('berjer') && productNameLower.includes('berjer')) ||
                             (configLower.includes('üçlü') && productNameLower.includes('üçlü')) ||
                             (configLower.includes('köşe') && productNameLower.includes('köşe')) ||
                             (configLower.includes('ikili') && productNameLower.includes('ikili'))
        
        if (hasConfigMatch) foundProduct = productById
      }
    }
  }

  // 3. product_sku fallback
  if (!foundProduct && order.product_sku) {
    const productBySku = allProducts.find(p => p.sku === order.product_sku)
    if (productBySku) {
      if (!order.configuration) {
        foundProduct = productBySku
      } else {
        const productNameLower = productBySku.name.toLowerCase()
        const configLower = order.configuration.toLowerCase()
        const hasConfigMatch = (configLower.includes('berjer') && productNameLower.includes('berjer')) ||
                             (configLower.includes('üçlü') && productNameLower.includes('üçlü')) ||
                             (configLower.includes('köşe') && productNameLower.includes('köşe')) ||
                             (configLower.includes('ikili') && productNameLower.includes('ikili'))
        
        if (hasConfigMatch) foundProduct = productBySku
      }
    }
  }

  // 4. product_name fallback
  if (!foundProduct && order.product_name) {
    const nameLower = order.product_name.toLowerCase().trim()
    foundProduct = allProducts.find(p => p.name.toLowerCase().includes(nameLower)) || null
  }

  return {
    productId: foundProduct?.id || order.product_id || '',
    foundProduct
  }
}
