import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { randomUUID } from 'crypto'
import { generateProductionOrderNumber } from '@/lib/utils/codeGenerator'
import { logger } from '@/lib/utils/logger'

// POST: Siparişleri üretim emrine dönüştür
export const POST = withAuth(async (request: NextRequest) => {
  logger.info('[BAŞLANGI�!] Sipariş dönüştürme API çaşrıldı')
  try {
    const body = await parseJsonBody(request)
    const { order_ids, due_date } = body

    logger.info('[1/5] İstek alındı', { order_ids, order_count: order_ids?.length || 0 })

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      logger.error('[HATA] Sipariş ID\'leri eksik veya geçersiz', { order_ids })
      return NextResponse.json({ error: 'Sipariş ID\'leri gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    logger.info('[2/5] Veritabanı başlantısı alındı')
    const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
    const convertedOrders: any[] = []
    const errors: string[] = []
    const skippedOrders: string[] = []

  function getRequiredQuantity(db: ReturnType<typeof getDatabase>, item: any, orderQty: number) {
    const firePercentage = (item.fire_percentage || 0) as number
    const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))
    const fromUnit = (item.unit || item.material_unit || '').toString()
    const toUnit = (item.material_unit || '').toString()
    const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
    const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
    return convertedQuantity * orderQty
  }

  function findBomProductIdByName(db: ReturnType<typeof getDatabase>, name: string, excludeId: string) {
    if (!name) return null
    const row = db.prepare(`
      SELECT p.id as id
      FROM active_products p
      JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE p.name = ? AND p.id != ?
      GROUP BY p.id
      ORDER BY COUNT(b.id) DESC
      LIMIT 1
    `).get(name, excludeId) as { id: string } | undefined
    return row?.id || null
  }

    // �NCE: Tüm siparişler için BOM ve stok kontrolü yap
    const ordersToConvert: any[] = []
    
    for (const orderId of order_ids) {
      // Siparişi al
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
      if (!order) {
        errors.push(`Sipariş bulunamadı: ${orderId}`)
        continue
      }

      // Sipariş zaten dönüştürülmüş mü kontrol et
      if (order.production_order_id) {
        const skipMsg = `Sipariş ${order.order_number} zaten üretim emrine dönüştürülmüş`
        logger.warn(`[ATLANDI] ${skipMsg}`, { 
          order_id: orderId, 
          production_order_id: order.production_order_id 
        })
        skippedOrders.push(skipMsg)
        continue
      }

      if (order.status === 'in_production' || order.status === 'completed') {
        errors.push(`Sipariş ${order.order_number} zaten üretimde veya tamamlanmış`)
        continue
      }

      // �Srün ID'sini belirle veya doşrula
      let productId = order.product_id
      
      // Eşer product_id varsa, ürünün konfigürasyonla uyuşup uyuşmadışını kontrol et
      if (productId && order.configuration) {
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(productId) as any
        if (product && product.name) {
          const productNameLower = (product.name || '').toLowerCase()
          const configLower = (order.configuration || '').toLowerCase().trim()
          
          // Konfigürasyon kelimesini normalize et
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
          
          // �Srün adının konfigürasyonla uyuşup uyuşmadışını kontrol et
          if (configKeyword) {
            const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)
            const hasConfigKeyword = productNameLower.includes(configKeyword)
            const hasOtherConfig = otherConfigs.some(c => productNameLower.includes(c))
            
            // Eşer ürün adı seçilen konfigürasyonu içermiyorsa VEYA başka konfigürasyon içeriyorsa, yeniden eşleştirme yap
            if (!hasConfigKeyword || hasOtherConfig) {
              logger.warn(`[�SR�SN DOĞRULAMA] Mevcut product_id (${productId}) yanlış ürünü işaret ediyor: "${product.name}" (sipariş: ${order.configuration}), yeniden eşleştirme yapılıyor...`)
              productId = null // product_id'yi sıfırla, yeniden eşleştirme yapılacak
            } else {
              logger.info(`[�SR�SN DOĞRULAMA] Mevcut product_id (${productId}) doşru: "${product.name}" (sipariş: ${order.configuration})`)
            }
          }
        }
      }
      
      // Eşer product_id yoksa veya doşrulanamadıysa, ürünü bul
      if (!productId) {
        // �Srün eşleştirilmemiş, ürünü bul
        if (order.product_sku) {
          const existingProduct = db.prepare('SELECT id, name FROM products WHERE sku = ?').get(order.product_sku) as any
          if (existingProduct) {
            // SKU ile bulunan ürünün konfigürasyonla uyuşup uyuşmadışını kontrol et
            if (order.configuration) {
              const productNameLower = (existingProduct.name || '').toLowerCase()
              const configLower = (order.configuration || '').toLowerCase().trim()
              
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
              
              if (configKeyword) {
                const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)
                const hasConfigKeyword = productNameLower.includes(configKeyword)
                const hasOtherConfig = otherConfigs.some(c => productNameLower.includes(c))
                
                if (hasConfigKeyword && !hasOtherConfig) {
                  productId = existingProduct.id
                  logger.info(`[�SR�SN EŞLEŞTİRME] product_sku ile bulundu: "${existingProduct.name}" (ID: ${productId})`)
                } else {
                  logger.warn(`[�SR�SN EŞLEŞTİRME] product_sku ile bulunan ürün konfigürasyonla uyuşmuyor: "${existingProduct.name}" (sipariş: ${order.configuration})`)
                }
              } else {
                productId = existingProduct.id
              }
            } else {
              productId = existingProduct.id
            }
          }
        }

        // �NEMLİ: �Srün adı + konfigürasyon kombinasyonuna göre bul (frontend'deki gibi)
        if (!productId && order.product_name && order.configuration) {
          const productNameLower = (order.product_name || '').toLowerCase().trim()
          const configLower = (order.configuration || '').toLowerCase().trim()
          
          // �Srün adından parantez içindeki kısmı kaldır ve ilk kelimeyi al (örn: "GALATA (BERJER)" �  "galata")
          const productBaseName = productNameLower
            .replace(/\([^)]*\)/g, '') // Parantez içindeki kısmı kaldır
            .trim()
            .split(' ')[0] // İlk kelimeyi al
            .trim()
          
          // Konfigürasyon kelimesini normalize et
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
          
          if (configKeyword) {
            const expectedProductName = `${productBaseName} ${configKeyword}`.toLowerCase()
            const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)
            
            // �nce tam eşleşme dene
            const exactMatch = db.prepare(`
              SELECT id, name FROM products 
              WHERE LOWER(TRIM(name)) = ?
            `).get(expectedProductName) as any
            
            if (exactMatch) {
              // Tam eşleşme bulundu, diğer konfigürasyonları içermediğini kontrol et
              const pNameLower = (exactMatch.name || '').toLowerCase()
              const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
              
              if (!hasOtherConfig) {
                productId = exactMatch.id
                logger.info(`[�SR�SN EŞLEŞTİRME] Tam eşleşme: "${order.product_name}" (${order.configuration}) �  "${exactMatch.name}" (ID: ${productId})`)
              }
            }
            
            // Tam eşleşme yoksa, kısmi eşleşme dene
            if (!productId) {
              const allProducts = db.prepare('SELECT id, name, sku FROM products').all() as any[]
              
              // �nce tüm eşleşen ürünleri bul
              const matchingProducts = allProducts.filter(p => {
                const pNameLower = (p.name || '').toLowerCase().trim()
                const hasBaseName = pNameLower.includes(productBaseName)
                const hasConfigKeyword = pNameLower.includes(configKeyword)
                const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
                return hasBaseName && hasConfigKeyword && !hasOtherConfig
              })
              
              // Eşer birden fazla eşleşen ürün varsa, SKU'ya göre sırala (daha yüksek numaralı SKU'yu tercih et)
              if (matchingProducts.length > 1) {
                matchingProducts.sort((a: any, b: any) => {
                  const aNum = parseInt((a.sku || '').replace(/[^0-9]/g, '')) || 0
                  const bNum = parseInt((b.sku || '').replace(/[^0-9]/g, '')) || 0
                  return bNum - aNum // Ters sıralama - en yüksek numara önce
                })
                productId = matchingProducts[0].id
                logger.info(`[�SR�SN EŞLEŞTİRME] Kısmi eşleşme (${matchingProducts.length} adet bulundu, en yüksek SKU seçildi): "${order.product_name}" (${order.configuration}) �  "${matchingProducts[0].name}" (SKU: ${matchingProducts[0].sku}, ID: ${productId})`)
              } else if (matchingProducts.length === 1) {
                productId = matchingProducts[0].id
                logger.info(`[�SR�SN EŞLEŞTİRME] Kısmi eşleşme: "${order.product_name}" (${order.configuration}) �  "${matchingProducts[0].name}" (ID: ${productId})`)
              }
            }
          }
        }
        
        // Son çare: Sadece ürün adına göre bul (konfigürasyon yoksa veya yukarıdaki eşleşme başarısızsa)
        // Ama bu durumda uyarı ver çünkü yanlış ürün bulunabilir
        if (!productId && order.product_name) {
          const productNameClean = (order.product_name || '').toLowerCase().trim().replace(/\([^)]*\)/g, '').trim().split(' ')[0]
          const existingProduct = db.prepare(`
            SELECT id, name FROM products 
            WHERE LOWER(TRIM(name)) LIKE ?
            LIMIT 1
          `).get(`%${productNameClean}%`) as any
          if (existingProduct) {
            productId = existingProduct.id
            logger.warn(`[�SR�SN EŞLEŞTİRME] Son çare (sadece ürün adı): "${order.product_name}" �  "${existingProduct.name}" (ID: ${productId}) - Konfigürasyon eşleştirmesi başarısız!`)
          }
        }

        if (!productId) {
          errors.push(`Sipariş ${order.order_number} için ürün bulunamadı (${order.product_name || order.product_sku || 'Bilinmeyen'}${order.configuration ? ` - ${order.configuration}` : ''})`)
          continue
        }

        // Siparişi güncelle
        db.prepare('UPDATE orders SET product_id = ? WHERE id = ?').run(productId, orderId)
        order.product_id = productId
      }

      // �Srün bilgisini al
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id) as any
      if (!product) {
        logger.error(`[�SR�SN BULUNAMADI] Sipariş ${order.order_number} için product_id: ${order.product_id} bulunamadı`)
        // product_id geçersiz, siparişteki product_id'yi temizle ve tekrar ürün eşleştirmesi yap
        db.prepare('UPDATE orders SET product_id = NULL WHERE id = ?').run(orderId)
        errors.push(`Sipariş ${order.order_number} için ürün bulunamadı (�Srün ID'si geçersiz: ${order.product_id}). Lütfen siparişi kontrol edin ve doşru ürünü seçin.`)
        continue
      }

      logger.info(`[BOM KONTROL�S] Sipariş: ${order.order_number}, �Srün: ${product.name} (ID: ${order.product_id}, SKU: ${product.sku}), Konfigürasyon: ${order.configuration}`)

      // BOM kontrolü
      let bomProductId = order.product_id
      let bom = db.prepare(`
        SELECT 
          b.material_id,
          b.quantity_required,
          b.unit as unit,
          m.name as material_name,
          m.code as material_code,
          m.category as material_category,
          m.stock_amount,
          m.unit as material_unit,
          m.reserved_quantity,
          COALESCE(b.fire_percentage, 0) as fire_percentage
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(bomProductId) as any[]

      if (bom.length === 0) {
        const fallbackId = findBomProductIdByName(db, product.name, order.product_id)
        if (fallbackId) {
          bomProductId = fallbackId
          bom = db.prepare(`
            SELECT 
              b.material_id,
              b.quantity_required,
              b.unit as unit,
              m.name as material_name,
              m.code as material_code,
              m.category as material_category,
              m.stock_amount,
              m.unit as material_unit,
              m.reserved_quantity,
              COALESCE(b.fire_percentage, 0) as fire_percentage
            FROM bom b
            JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
            JOIN materials m ON b.material_id = m.id
            WHERE b.product_id = ? AND b.deleted_at IS NULL
          `).all(bomProductId) as any[]

          if (bom.length > 0) {
            logger.info('[BOM KONTROLÜ] İsim eşleşmesi ile BOM bulundu', {
              order_number: order.order_number,
              product_id: order.product_id,
              fallback_product_id: bomProductId,
              product_name: product.name,
            })
          }
        }
      }

      logger.info(`[BOM KONTROL�S] Sipariş: ${order.order_number}, �Srün: ${product.name}, Bulunan BOM sayısı: ${bom.length}`)
      
      if (bom.length === 0) {
        // Hangi ürünler için BOM var kontrol et (debug için)
        const allBomProducts = db.prepare(`
          SELECT DISTINCT p.id, p.name, p.sku, COUNT(bv.id) as bom_count
          FROM products p
          LEFT JOIN bom b ON p.id = b.product_id
          LEFT JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          WHERE p.name LIKE ?
          GROUP BY p.id, p.name, p.sku
        `).all(`%galata%`) as any[]
        
        logger.warn(`[BOM KONTROL�S] Sipariş: ${order.order_number}, �Srün: ${product.name} (ID: ${order.product_id}) için BOM bulunamadı. Galata ürünleri ve BOM sayıları:`, allBomProducts)
        
        errors.push(`Sipariş ${order.order_number} için ürün reçetesi (BOM) bulunamadı: ${product.name || product.sku} (ID: ${order.product_id})`)
        continue
      }

      // Stok yeterlilişini kontrol et - DETAYLI KONTROL (Kumaş kodu kontrolü ile)
      // Siparişteki kumaş kodunu çıkar
      let orderFabricCode: string | null = null
      if (order.notes) {
        const fabricMatch = order.notes.match(/Kumaş:\s*([^|]+)/i)
        if (fabricMatch) {
          orderFabricCode = fabricMatch[1].trim()
          logger.info(`[STOK KONTROL�S] Siparişteki kumaş kodu: ${orderFabricCode}`, { order_number: order.order_number })
        }
      }
      
      logger.info(`[STOK KONTROL�S] Sipariş ${order.order_number} için stok kontrolü başlıyor`, {
        order_id: orderId,
        product_id: order.product_id,
        product_name: product.name,
        quantity: order.quantity,
        bom_item_count: bom.length,
        order_fabric_code: orderFabricCode
      })
      
      // Siparişteki kumaş koduna göre hammadde depodan kumaşı bul
      let orderFabricMaterial: any = null
      if (orderFabricCode) {
        // Hammadde depodan siparişteki kumaş koduna sahip malzemeyi bul
        orderFabricMaterial = db.prepare(`
          SELECT id, code, name, stock_amount, unit, category
          FROM materials
          WHERE category = 'Kumaş' AND (
            LOWER(TRIM(name)) = ? OR 
            LOWER(TRIM(name)) LIKE ? OR
            LOWER(TRIM(code)) = ?
          )
          LIMIT 1
        `).get(
          orderFabricCode.toLowerCase().trim(),
          `%${orderFabricCode.toLowerCase().trim()}%`,
          orderFabricCode.toLowerCase().trim()
        ) as any
        
        if (orderFabricMaterial) {
          logger.info(`[KUMAŞ KONTROL�S] Siparişteki kumaş kodu için hammadde bulundu: ${orderFabricMaterial.code || orderFabricMaterial.name} (ID: ${orderFabricMaterial.id})`, {
            order_fabric_code: orderFabricCode,
            material_id: orderFabricMaterial.id,
            material_name: orderFabricMaterial.name,
            material_code: orderFabricMaterial.code,
            stock_amount: orderFabricMaterial.stock_amount
          })
        } else {
          logger.warn(`[KUMAŞ KONTROL�S] Siparişteki kumaş kodu için hammadde bulunamadı: ${orderFabricCode}`)
        }
      }
      
      const stockErrors: string[] = []
      for (const item of bom) {
        const materialCategory = (item as any).material_category
        
        // Eşer malzeme kumaş kategorisindeyse, siparişteki kumaş koduna göre kontrol yap
        if (materialCategory && materialCategory.toLowerCase() === 'kumaş' && orderFabricCode) {
          // BOM'daki kumaş malzemesini atla, siparişteki kumaş koduna göre hammadde depodan kontrol yap
          if (orderFabricMaterial) {
            // Siparişteki kumaş koduna göre stok kontrolü yap
            const bomFabricItem = bom.find(b => (b as any).material_category && (b as any).material_category.toLowerCase() === 'kumaş')
            if (bomFabricItem) {
              const required = getRequiredQuantity(db, {
                ...bomFabricItem,
                material_unit: orderFabricMaterial.unit
              }, order.quantity)
              const available = (orderFabricMaterial.stock_amount || 0) - (orderFabricMaterial.reserved_quantity || 0)
              
              logger.info(`[STOK KONTROL�S] Kumaş stok kontrolü (siparişteki kumaş koduna göre)`, {
                order_fabric_code: orderFabricCode,
                material_id: orderFabricMaterial.id,
                material_name: orderFabricMaterial.name,
                material_code: orderFabricMaterial.code,
                quantity_required: (bomFabricItem as any).quantity_required,
                fire_percentage: (bomFabricItem as any).fire_percentage || 0,
                quantity_with_fire: required / order.quantity,
                order_quantity: order.quantity,
                required_total: required,
                available_stock: available,
                unit: orderFabricMaterial.unit,
                sufficient: available >= required
              })
              
              if (available < required) {
                const shortage = required - available
                const errorMsg = `Sipariş ${order.order_number} için stok yetersiz: ${orderFabricMaterial.name || orderFabricMaterial.code} ` +
                  `(Gereken: ${required.toFixed(2)} ${orderFabricMaterial.unit}, Mevcut: ${available.toFixed(2)} ${orderFabricMaterial.unit}, Eksik: ${shortage.toFixed(2)} ${orderFabricMaterial.unit})`
                stockErrors.push(errorMsg)
                errors.push(errorMsg)
                logger.error(`[STOK KONTROL�S] Kumaş stok yetersiz (siparişteki kumaş koduna göre)`, {
                  material_name: orderFabricMaterial.name,
                  required: required,
                  available: available,
                  shortage: shortage
                })
              }
            }
          } else {
            // Siparişteki kumaş kodu için hammadde bulunamadı
            const errorMsg = `Sipariş ${order.order_number} için kumaş kodu "${orderFabricCode}" hammadde depoda bulunamadı`
            stockErrors.push(errorMsg)
            errors.push(errorMsg)
            logger.error(`[KUMAŞ KONTROL�S] ${errorMsg}`)
          }
          continue // BOM'daki kumaş malzemesini atla, siparişteki kumaş koduna göre kontrol yaptık
        }
        
        const required = getRequiredQuantity(db, item, order.quantity)
        const available = (item.stock_amount || 0) - (item.reserved_quantity || 0)
        
        logger.info(`[STOK KONTROL�S] Malzeme kontrolü`, {
          material_id: item.material_id,
          material_name: item.material_name,
          material_category: materialCategory,
          material_code: item.material_code,
          quantity_required: item.quantity_required,
          fire_percentage: item.fire_percentage || 0,
          quantity_with_fire: required / order.quantity,
          order_quantity: order.quantity,
          required_total: required,
          available_stock: available,
          unit: item.material_unit,
          sufficient: available >= required
        })
        
        if (available < required) {
          const shortage = required - available
          const errorMsg = `Sipariş ${order.order_number} için stok yetersiz: ${item.material_name} ` +
            `(Gereken: ${required.toFixed(2)} ${item.material_unit}, Mevcut: ${available.toFixed(2)} ${item.material_unit}, Eksik: ${shortage.toFixed(2)} ${item.material_unit})`
          stockErrors.push(errorMsg)
          errors.push(errorMsg)
          logger.error(`[STOK KONTROL�S] Stok yetersiz`, {
            material_name: item.material_name,
            required: required,
            available: available,
            shortage: shortage
          })
        }
      }
      
      // Eşer stok hatası varsa, bu siparişi atla
      if (stockErrors.length > 0) {
        logger.warn(`[STOK KONTROL�S] Sipariş ${order.order_number} stok yetersizlişi nedeniyle atlandı`, {
          stock_errors: stockErrors
        })
        continue // Bu sipariş için daha fazla işlem yapma
      }
      
      logger.info(`[STOK KONTROL�S] Sipariş ${order.order_number} için tüm stoklar yeterli �S`)

      // Eşer bu sipariş için hata yoksa, dönüştürme listesine ekle
      if (!errors.some(e => e.includes(order.order_number))) {
        ordersToConvert.push({ ...order, product, bom, orderFabricMaterial })
      }
    }

    // Eşer herhangi bir hata varsa, detaylı bilgi ver
    if (errors.length > 0) {
      logger.error(`[STOK KONTROL�S] Toplam ${errors.length} hata bulundu, hiçbir sipariş dönüştürülmedi`, {
        error_count: errors.length,
        errors: errors,
        orders_checked: order_ids.length,
        orders_to_convert: ordersToConvert.length
      })
      
      return NextResponse.json({ 
        success: false,
        error: 'Üretim emrine dönüştürme başarısız - Stok veya Reçete Kontrolü',
        details: errors,
        message: `${errors.length} hata bulundu. Lütfen stokları ve ürün reçetelerini kontrol edin.`,
        converted_orders: [],
        skipped_orders: skippedOrders
      }, { status: 400 })
    }
    
    // Kontrol başarılı
    logger.info(`[STOK KONTROL�S] Tüm kontroller başarılı, ${ordersToConvert.length} sipariş dönüştürülecek`, {
      orders_to_convert: ordersToConvert.map(o => o.order_number)
    })

    // Tüm kontroller başarılı, şimdi üretim emirlerini oluştur
    // HER SİPARİŞ İ�!İN AYRI AYRI İŞLEM YAP - Transaction'ları izole et
    for (const orderData of ordersToConvert) {
      const order = orderData
      const product = orderData.product
      const bom = orderData.bom
      const orderFabricMaterial = (orderData as any).orderFabricMaterial

      // Order ID'yi sabitle (transaction içinde kullanmak için)
      const orderIdToUpdate = order.id
      const orderNumberToUpdate = order.order_number

      // Üretim emri oluştur
      const productionOrderId = randomUUID()
      
      // Benzersiz üretim emri numarası oluştur (veritabanından direkt)
      let orderNumber = ''
      let retryCount = 0
      const maxRetries = 20
      
      while (retryCount < maxRetries) {
        // Veritabanından en yüksek numarayı al
        const lastOrder = db.prepare(`
          SELECT order_number 
          FROM production_orders 
          WHERE order_number LIKE 'URE-%'
          ORDER BY CAST(SUBSTR(order_number, 5) AS INTEGER) DESC
          LIMIT 1
        `).get() as any
        
        let baseNumber = 1
        if (lastOrder && lastOrder.order_number) {
          // Son numaradan bir sonraki numarayı üret
          const lastNumber = parseInt(lastOrder.order_number.replace('URE-', ''), 10)
          baseNumber = isNaN(lastNumber) ? 1 : lastNumber + 1
        }
        
        // Retry sayısını ekle (her denemede farklı numara)
        const nextNumber = baseNumber + retryCount
        orderNumber = `URE-${String(nextNumber).padStart(3, '0')}`
        
        // Numara benzersiz mi kontrol et
        const existing = db.prepare('SELECT id FROM production_orders WHERE order_number = ?').get(orderNumber) as any
        if (!existing) {
          break // Numara benzersiz, kullanılabilir
        }
        
        // Numara zaten var, retry sayısını artır ve tekrar dene
        logger.warn(`[RETRY ${retryCount + 1}] Üretim emri numarası zaten var: ${orderNumber}, yeni numara üretiliyor...`)
        retryCount++
      }
      
      if (retryCount >= maxRetries || !orderNumber) {
        throw new Error(`Benzersiz üretim emri numarası oluşturulamadı (${maxRetries} deneme)`)
      }
      
      logger.info(`[NUMARA] Üretim emri numarası oluşturuldu: ${orderNumber}`, { retry_count: retryCount })

      // BOM'dan purchase_price bilgisini al (transaction dışında)
      const bomWithPrices = bom.map((item: any) => {
        const material = db.prepare('SELECT COALESCE(purchase_price, 0) as purchase_price FROM materials WHERE id = ?').get(item.material_id) as any
        return {
          ...item,
          purchase_price: material?.purchase_price || 0
        }
      })

      // Malzeme maliyetini hesapla
      let totalMaterialCost = 0
      for (const item of bomWithPrices) {
        const totalRequired = getRequiredQuantity(db, item, order.quantity)
        const itemCost = totalRequired * (item as any).purchase_price
        totalMaterialCost += itemCost
      }

      // İşçilik maliyeti (şimdilik 0, ileride ürün bazlı eklenebilir)
      const laborCostPerUnit = 0
      const totalLaborCost = laborCostPerUnit * order.quantity
      const totalCost = totalMaterialCost + totalLaborCost

      // Maliyet hesaplama
      const costs = {
        materialCost: totalMaterialCost,
        laborCost: totalLaborCost,
        totalCost: totalCost
      }

      // Kar hesaplama - calculateProfit(sellingPrice, totalCost) şeklinde çaşrılmalı
      const { calculateProfit } = await import('@/lib/utils/costCalculator')
      const sellingPrice = (order.unit_price || product.selling_price || product.price || 0) * order.quantity
      const profitObj = calculateProfit(sellingPrice, totalCost)
      const profitValue = profitObj.profit || 0

      // Her barkod için tamamen benzersiz numara üret (UUID ve timestamp kullanarak)
      const barcodesToInsert: Array<{ id: string; barcode: string; serial: string }> = []
      
      // İlk timestamp'i al (her sipariş için farklı olacak)
      const baseTimestamp = Date.now()
      
      for (let i = 0; i < order.quantity; i++) {
        let barcode = ''
        let serial = ''
        let retryBarcode = 0
        const maxBarcodeRetries = 100
        
        while (retryBarcode < maxBarcodeRetries) {
          // Her barkod için tamamen benzersiz numara üret
          // i * 10000 ile her ürün için farklı timestamp garantisi
          const uniqueId = randomUUID().replace(/-/g, '') // UUID'den tireleri kaldır
          const timestamp = baseTimestamp + (i * 10000) + retryBarcode
          const randomPart = Math.floor(Math.random() * 1000000) + (i * 137) // i ile çarpılmış random deşer
          
          // EAN-13 formatı: 869 (Türkiye) + 9 haneli benzersiz kod + 1 kontrol hanesi = 13 hane
          const countryCode = '869'
          
          // SKU'dan sayısal deşer çıkar (4 hane)
          const skuNumeric = product.sku
            .split('')
            .map((char: string) => char.charCodeAt(0) % 10)
            .join('')
            .padStart(4, '0')
            .slice(0, 4)
          
          // Benzersiz kod: SKU(4) + Timestamp son 3 hanesi(3) + Random son 2 hanesi(2) = 9 hane
          // i deşerini de dahil et (son basamaşa ekle)
          const timestampPart = String(timestamp).slice(-3)
          const randomPartStr = String(randomPart).slice(-2)
          const sequencePart = String(i).padStart(1, '0').slice(-1) // i'yi de ekle (son hane)
          const uniqueCode = `${skuNumeric}${timestampPart}${randomPartStr}`.slice(0, 9)
          
          // EAN-13 kontrol hanesi hesapla
          const digits = (countryCode + uniqueCode).split('').map(Number)
          let sum = 0
          for (let j = 0; j < 12; j++) {
            sum += digits[j] * (j % 2 === 0 ? 1 : 3)
          }
          const checkDigit = (10 - (sum % 10)) % 10
          
          barcode = `${countryCode}${uniqueCode}${checkDigit}`
          
          // Seri numarası: SN-YYYYMMDD-UUID kısa versiyonu (her ürün için farklı UUID)
          const today = new Date()
          const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
          const shortUuid = uniqueId.substring(i * 2, (i * 2) + 8).toUpperCase() || uniqueId.substring(0, 8).toUpperCase()
          const sequenceSuffix = String(i + 1).padStart(2, '0')
          serial = `SN-${dateStr}-${shortUuid}-${sequenceSuffix}`
          
          // Barkod veritabanında var mı kontrol et
          const existingBarcode = db.prepare('SELECT id FROM product_serial_numbers WHERE barcode = ?').get(barcode) as any
          if (!existingBarcode) {
            break // Barkod benzersiz, kullanılabilir
          }
          
          logger.warn(`[BARKOD RETRY ${retryBarcode + 1}] Barkod zaten var: ${barcode}, yeni barkod üretiliyor...`, {
            barcode,
            i,
            timestamp,
            randomPart
          })
          retryBarcode++
        }
        
        if (retryBarcode >= maxBarcodeRetries || !barcode || !serial) {
          throw new Error(`Benzersiz barkod oluşturulamadı (${maxBarcodeRetries} deneme) - �Srün: ${product.sku}, Adet: ${i + 1}/${order.quantity}`)
        }
        
        barcodesToInsert.push({
          id: randomUUID(),
          barcode,
          serial,
        })
        
        logger.info(`[BARKOD ${i + 1}/${order.quantity}] Barkod oluşturuldu: ${barcode}, Seri: ${serial}`)
      }
      
      logger.info(`[BARKOD] ${barcodesToInsert.length} adet tamamen benzersiz barkod üretildi`, {
        product_id: order.product_id,
        product_sku: product.sku,
        barcodes: barcodesToInsert.map(b => b.barcode)
      })

      // HER SİPARİŞ İ�!İN YENİ BİR TRANSACTION OLUŞTUR
      try {
        // TRANSACTION MEKANİZMASINI KALDIR - Direkt güncelleme yap
        logger.info(`[BAŞLANGI�!] Sipariş ${orderNumberToUpdate} dönüştürülüyor...`, { order_id: orderIdToUpdate })
        
        // �NCE: Mevcut durumu kontrol et
        const beforeUpdate = db.prepare('SELECT production_order_id, status FROM orders WHERE id = ?').get(orderIdToUpdate) as any
        logger.info(`[�NCE] Sipariş ${orderNumberToUpdate} mevcut durum`, {
          order_id: orderIdToUpdate,
          current_production_order_id: beforeUpdate?.production_order_id,
          current_status: beforeUpdate?.status
        })
        
        // 1. Üretim emrini oluştur
        // Not: created_at ve updated_at DEFAULT CURRENT_TIMESTAMP ile otomatik doldurulur
        // Berjer ürünleri için direkt terzihane'ye yönlendir
        const isBerjer = product.name && product.name.toLowerCase().includes('berjer')
        const initialStation = isBerjer ? 'terzihane' : 'iskelet'
        const now = new Date().toISOString()
        
        try {
          db.prepare(`
            INSERT INTO production_orders (
              id, order_number, product_id, quantity, status, current_station, due_date,
              material_cost, labor_cost, total_cost, selling_price, profit,
              terzihane_started_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            productionOrderId,
            orderNumber,
            order.product_id,
            order.quantity,
            'in_progress',
            initialStation,
            due_date || order.delivery_date || null, // Frontend'deki teslim tarihini öncelikle kullan, yoksa siparişteki delivery_date'i kullan
            costs.materialCost ?? 0,
            costs.laborCost ?? 0,
            costs.totalCost ?? 0,
            order.unit_price || product.selling_price || product.price || 0,
            profitValue,
            isBerjer ? now : null
          )
        } catch (insertError: any) {
          logger.error(`[INSERT HATASI] Sipariş ${orderNumberToUpdate} için üretim emri oluşturulamadı`, {
            error: insertError.message,
            error_code: insertError.code,
            kolon_sayisi: 11,
            parametre_sayisi: 11,
            production_order_id: productionOrderId,
            order_number: orderNumber,
            product_id: order.product_id,
            quantity: order.quantity,
            material_cost: costs.materialCost,
            labor_cost: costs.laborCost,
            total_cost: costs.totalCost,
            selling_price: order.unit_price || product.selling_price || product.price,
            profit: profitValue,
            sql: `INSERT INTO production_orders (id, order_number, product_id, quantity, status, due_date, material_cost, labor_cost, total_cost, selling_price, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          })
          throw insertError
        }
        logger.info(`[1/5] Üretim emri oluşturuldu: ${orderNumber}`, { production_order_id: productionOrderId })

        db.prepare(`
          INSERT INTO production_costs
          (id, production_order_id, material_cost, labor_cost, overhead_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          productionOrderId,
          costs.materialCost ?? 0,
          costs.laborCost ?? 0,
          0,
          costs.totalCost ?? 0
        )

        // 2. Stokları düş - Siparişteki kumaş koduna göre
        for (const item of bom) {
          const materialCategory = (item as any).material_category
          
          // Eşer malzeme kumaş kategorisindeyse, siparişteki kumaş koduna göre stoktan düş
          if (materialCategory && materialCategory.toLowerCase() === 'kumaş' && orderFabricMaterial) {
            // Siparişteki kumaş koduna göre hammadde depodan stoktan düş
            const firePercentage = (item as any).fire_percentage || 0
            const fromUnit = ((item as any).unit || orderFabricMaterial.unit || '').toString()
            const toUnit = (orderFabricMaterial.unit || '').toString()
            const factor = resolveUnitFactor(db, (item as any).material_id || null, fromUnit, toUnit)
            const baseRequired = ((item as any).quantity_required * order.quantity) * (factor || 1)
            const totalRequired = baseRequired * (1 + (firePercentage / 100))

            logger.info(`[STOK D�SŞ�SM�S] Kumaş stoktan düşülüyor (siparişteki kumaş koduna göre)`, {
              order_fabric_code: orderFabricMaterial.name || orderFabricMaterial.code,
              material_id: orderFabricMaterial.id,
              material_name: orderFabricMaterial.name,
              material_code: orderFabricMaterial.code,
              quantity_required: (item as any).quantity_required,
              fire_percentage: firePercentage,
              quantity_with_fire: totalRequired / order.quantity,
              order_quantity: order.quantity,
              total_required: totalRequired,
              available_before: orderFabricMaterial.stock_amount
            })

            // Siparişteki kumaş koduna göre hammadde depodan stoktan düş
            applyMaterialStockChange(db, orderFabricMaterial.id, -totalRequired)

            // Stok hareketi kaydet
            const movementId = randomUUID()
            db.prepare(`
              INSERT INTO stock_movements (
                id, material_id, movement_type, quantity, reference_type, reference_id, notes
              ) VALUES (?, ?, 'out', ?, 'production_order', ?, ?)
            `).run(
              movementId,
              orderFabricMaterial.id,
              totalRequired, // Pozitif deşer (movement_type 'out' olduşu için stok düşecek)
              productionOrderId,
              `Üretim emri: ${orderNumber} - ${orderFabricMaterial.name || orderFabricMaterial.code}`
            )

            // Fiili harcanan malzemeleri kaydet
            db.prepare(`
              INSERT INTO production_actual_consumption (
                id, production_order_id, material_id, planned_quantity,
                actual_quantity, fire_quantity, variance, variance_percentage
              ) VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL)
            `).run(
              randomUUID(),
              productionOrderId,
              orderFabricMaterial.id,
              baseRequired,
              totalRequired - baseRequired
            )
            
            continue // BOM'daki kumaş malzemesini atla, siparişteki kumaş koduna göre işlem yaptık
          }
          
          // Diğer malzemeler için normal stok düşümü
          const firePercentage = (item as any).fire_percentage || 0
          const fromUnit = ((item as any).unit || (item as any).material_unit || '').toString()
          const toUnit = ((item as any).material_unit || '').toString()
          const factor = resolveUnitFactor(db, (item as any).material_id || null, fromUnit, toUnit)
          const baseRequired = ((item as any).quantity_required * order.quantity) * (factor || 1)
          const totalRequired = baseRequired * (1 + (firePercentage / 100))

          // Malzeme stokunu güncelle
          applyMaterialStockChange(db, (item as any).material_id, -totalRequired)

          // Stok hareketi kaydet
          const movementId = randomUUID()
          db.prepare(`
            INSERT INTO stock_movements (
              id, material_id, movement_type, quantity, reference_type, reference_id, notes
            ) VALUES (?, ?, 'out', ?, 'production_order', ?, ?)
          `).run(
            movementId,
            (item as any).material_id,
            totalRequired, // Pozitif deşer (movement_type 'out' olduşu için stok düşecek)
            productionOrderId,
            `Üretim emri: ${orderNumber} - ${(item as any).material_name}`
          )

          // Fiili harcanan malzemeleri kaydet
          db.prepare(`
            INSERT INTO production_actual_consumption (
              id, production_order_id, material_id, planned_quantity,
              actual_quantity, fire_quantity, variance, variance_percentage
            ) VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL)
          `).run(
            randomUUID(),
            productionOrderId,
            (item as any).material_id,
            baseRequired,
            totalRequired - baseRequired
          )
        }
        logger.info(`[2/5] Stoklar düşürüldü`, { production_order_id: productionOrderId })

        // 3. Barkodları oluştur
        for (const barcodeData of barcodesToInsert) {
          db.prepare(`
            INSERT INTO product_serial_numbers (
              id, product_id, serial_number, barcode, production_order_id, status, notes
            ) VALUES (?, ?, ?, ?, ?, 'in_production', ?)
          `).run(
            barcodeData.id,
            order.product_id,
            barcodeData.serial,
            barcodeData.barcode,
            productionOrderId,
            `Üretim emri: ${orderNumber}`
          )
        }
        logger.info(`[3/5] Barkodlar oluşturuldu`, { production_order_id: productionOrderId, barcode_count: barcodesToInsert.length })

        // 4. SİPARİŞİ G�SNCELLE - EN �NEMLİ ADIM
        // �NCE status'u güncelle (pending'den çıkar)
        const statusUpdate = db.prepare(`
          UPDATE orders 
          SET status = 'in_production', 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(orderIdToUpdate)
        logger.info(`[4a/5] Status güncellendi: ${orderNumberToUpdate}`, { 
          changes: statusUpdate.changes,
          order_id: orderIdToUpdate 
        })
        
        // SONRA production_order_id'yi ekle
        const updateResult = db.prepare(`
          UPDATE orders 
          SET production_order_id = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(productionOrderId, orderIdToUpdate)
        logger.info(`[4b/5] Production order ID eklendi: ${orderNumberToUpdate}`, { 
          changes: updateResult.changes,
          production_order_id: productionOrderId,
          order_id: orderIdToUpdate 
        })
        
        if (updateResult.changes === 0) {
          logger.error(`Sipariş ${orderNumberToUpdate} güncellenemedi`, { 
            order_id: orderIdToUpdate,
            production_order_id: productionOrderId,
            changes: updateResult.changes 
          })
          throw new Error(`Sipariş ${orderNumberToUpdate} (ID: ${orderIdToUpdate}) güncellenemedi (changes: 0)`)
        }
        
        // Hemen doşrulama yap
        const verify = db.prepare('SELECT production_order_id, status FROM orders WHERE id = ?').get(orderIdToUpdate) as any
        logger.info(`[4c/5] Doşrulama`, {
          production_order_id: verify?.production_order_id,
          status: verify?.status,
          beklenen_production_order_id: productionOrderId,
          beklenen_status: 'in_production',
          uyumlu: verify?.production_order_id === productionOrderId && verify?.status === 'in_production',
          order_id: orderIdToUpdate
        })
        
        if (!verify || verify.production_order_id !== productionOrderId || verify.status !== 'in_production') {
          logger.warn(`Sipariş ${orderNumberToUpdate} doşrulama başarısız, tekrar deneniyor...`, {
            verify,
            beklenen: { production_order_id: productionOrderId, status: 'in_production' }
          })
          // Son bir deneme daha
          db.prepare(`
            UPDATE orders 
            SET production_order_id = ?, 
                status = 'in_production',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(productionOrderId, orderIdToUpdate)
          
          const retryVerify = db.prepare('SELECT production_order_id, status FROM orders WHERE id = ?').get(orderIdToUpdate) as any
          if (!retryVerify || retryVerify.production_order_id !== productionOrderId || retryVerify.status !== 'in_production') {
            logger.error(`Sipariş ${orderNumberToUpdate} retry sonrası da doşrulanamadı`, {
              retryVerify,
              beklenen: { production_order_id: productionOrderId, status: 'in_production' }
            })
            throw new Error(`Sipariş ${orderNumberToUpdate} doşrulanamadı!`)
          }
          logger.info(`Sipariş ${orderNumberToUpdate} retry sonrası doşrulandı`)
        }
        
        // 5. Pending sorgusunda görünüyor mu kontrol et
        logger.info(`[5/5] Pending sorgusu kontrol ediliyor...`, { order_id: orderIdToUpdate })
        const pendingCheck = db.prepare(`
          SELECT COUNT(*) as count
          FROM orders
          WHERE status = 'pending'
            AND (production_order_id IS NULL OR production_order_id = '')
            AND id = ?
        `).get(orderIdToUpdate) as any
        
        logger.info(`[5/5] Pending kontrol sonucu`, {
          count: pendingCheck?.count,
          sipariş_numarası: orderNumberToUpdate,
          sipariş_id: orderIdToUpdate,
          production_order_id: productionOrderId
        })
        
        if (pendingCheck && pendingCheck.count > 0) {
          logger.error(`[KRİTİK] Sipariş ${orderNumberToUpdate} hala pending sorgusunda görünüyor! Zorla güncelleniyor...`, {
            order_id: orderIdToUpdate,
            pending_count: pendingCheck.count
          })
          // Zorla güncelle
          db.prepare(`
            UPDATE orders 
            SET status = 'in_production', 
                production_order_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(productionOrderId, orderIdToUpdate)
          logger.info(`[ZORLA] Sipariş ${orderNumberToUpdate} zorla güncellendi`)
        } else {
          logger.info(`[BAŞARILI] Sipariş ${orderNumberToUpdate} pending sorgusunda görünmüyor �S`, {
            order_id: orderIdToUpdate
          })
        }
        
        const result = {
          order_id: orderIdToUpdate,
          order_number: orderNumberToUpdate,
          production_order_id: productionOrderId,
          production_order_number: orderNumber,
          quantity: order.quantity
        }
        
        logger.info(`[TAMAMLANDI] Sipariş ${orderNumberToUpdate} başarıyla üretim emrine dönüştürüldü`, result)
        convertedOrders.push(result)
      } catch (error: any) {
        logger.error(`[HATA] Sipariş ${orderNumberToUpdate} dönüştürülürken hata`, {
          error_message: error.message,
          error_stack: error.stack,
          order_id: orderIdToUpdate,
          order_number: orderNumberToUpdate
        })
        errors.push(`Sipariş ${orderNumberToUpdate} dönüştürülemedi: ${error.message}`)
      }
    }

    logger.info('[TAMAMLANDI] Tüm sipariş dönüştürme işlemi tamamlandı', {
      converted_count: convertedOrders.length,
      error_count: errors.length,
      skipped_count: skippedOrders.length,
      converted_orders: convertedOrders.map(o => o.order_number),
      skipped_orders: skippedOrders,
      errors: errors
    })

    let message = `${convertedOrders.length} sipariş üretim emrine dönüştürüldü`
    if (skippedOrders.length > 0) {
      message += ` (${skippedOrders.length} sipariş zaten dönüştürülmüş, atlandı)`
    }

    return NextResponse.json({
      success: true,
      message: message,
      converted_orders: convertedOrders,
      skipped_orders: skippedOrders,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    logger.error('[KRİTİK HATA] Sipariş dönüştürme genel hatası', {
      error_message: error.message,
      error_stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


