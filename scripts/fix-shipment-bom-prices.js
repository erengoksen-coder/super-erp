const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

// resolveUnitFactor fonksiyonu
function resolveUnitFactor(db, materialId, fromUnit, toUnit) {
  if (!materialId || !fromUnit || !toUnit || fromUnit === toUnit) {
    return 1
  }
  
  try {
    const conversion = db.prepare(`
      SELECT conversion_factor 
      FROM unit_conversions 
      WHERE material_id = ? AND from_unit = ? AND to_unit = ?
    `).get(materialId, fromUnit, toUnit)
    
    return conversion?.conversion_factor || 1
  } catch (e) {
    return 1
  }
}

// extractProductName fonksiyonu
function extractProductName(fullName) {
  if (!fullName) return ''
  if (fullName.includes(' - ')) {
    const parts = fullName.split(' - ')
    return parts[parts.length - 1].trim()
  }
  const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
  if (skuMatch) {
    return skuMatch[1].trim()
  }
  return fullName.trim()
}

try {
  console.log('🔧 Sevkiyat kalemleri BOM fiyatları düzeltiliyor...\n')
  
  // Tüm sevkiyatları al
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${shipments.length} sevkiyat bulundu\n`)
  
  let updatedCount = 0
  
  for (const shipment of shipments) {
    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND si.deleted_at IS NULL
    `).all(shipment.id)
    
    console.log(`📄 ${shipment.shipment_number}:`)
    
    for (const item of items) {
      // BOM'dan fiyat hesapla
      let bomItems = db.prepare(`
        SELECT 
          b.quantity_required as quantity,
          b.unit as unit,
          b.fire_percentage,
          m.unit_price,
          m.unit as material_unit,
          m.id as material_id
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(item.product_id)
      
      // Aktif versiyonda BOM bulunamadıysa, fallback mekanizmasına geç (tüm versiyonlarda arama yapma, sadece aktif versiyonu kullan)
      
      // Eğer hala BOM bulunamadıysa, ürün adına göre eşleştirme yap
      if (bomItems.length === 0) {
        const product = db.prepare('SELECT id, name, sku FROM active_products WHERE id = ?').get(item.product_id)
        if (product) {
          const productNameOnly = extractProductName(product.name)
          
          if (productNameOnly) {
            const fallbackProducts = db.prepare(`
              SELECT DISTINCT p.id, p.name, p.sku
              FROM active_products p
              JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
              JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
              WHERE p.id != ? AND (
                p.name = ? OR 
                p.name LIKE ? OR
                (p.name LIKE ? AND p.name NOT LIKE ?)
              )
              GROUP BY p.id, p.name, p.sku
              ORDER BY COUNT(b.id) DESC
              LIMIT 1
            `).all(
              product.id,
              productNameOnly,
              `% - ${productNameOnly}%`,
              `%${productNameOnly}%`,
              `% - %${productNameOnly}%`
            )
            
            if (fallbackProducts.length > 0) {
              const fallbackProduct = fallbackProducts[0]
              console.log(`  🔄 Fallback: ${product.name} (${product.id}) → ${fallbackProduct.name} (${fallbackProduct.id})`)
              
              bomItems = db.prepare(`
                SELECT 
                  b.quantity_required as quantity,
                  b.unit as unit,
                  b.fire_percentage,
                  m.unit_price,
                  m.unit as material_unit,
                  m.id as material_id,
                  m.name as material_name
                FROM bom b
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
                JOIN materials m ON b.material_id = m.id
                WHERE b.product_id = ? AND b.deleted_at IS NULL
              `).all(fallbackProduct.id)
              
              console.log(`  📋 Fallback BOM kalemleri: ${bomItems.length} adet`)
            }
          }
        }
      }
      
      // BOM maliyetini hesapla
      let bomCost = 0
      for (const bomItem of bomItems) {
        const quantityWithFire = bomItem.quantity * (1 + (bomItem.fire_percentage || 0) / 100)
        const fromUnit = (bomItem.unit || bomItem.material_unit || '').toString()
        const toUnit = (bomItem.material_unit || '').toString()
        const factor = resolveUnitFactor(db, bomItem.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const materialUnitPrice = bomItem.unit_price || 0
        const itemCost = convertedQuantity * materialUnitPrice
        bomCost += itemCost
        if (bomItem.material_name) {
          console.log(`    - ${bomItem.material_name}: ${bomItem.quantity} ${fromUnit} x ${materialUnitPrice} = ${itemCost.toFixed(2)} ₺`)
        }
      }
      console.log(`  💰 Hesaplanan BOM fiyatı: ${bomCost.toFixed(2)} ₺`)
      
      // Eğer BOM maliyeti varsa, shipment_item'ı güncelle
      if (bomCost > 0) {
        const oldPrice = item.unit_price
        const newTotal = bomCost * item.quantity
        
        db.prepare(`
          UPDATE shipment_items 
          SET unit_price = ?, total_price = ?
          WHERE id = ?
        `).run(bomCost, newTotal, item.id)
        
        console.log(`  ✅ ${item.product_name}: ${oldPrice.toFixed(2)} ₺ → ${bomCost.toFixed(2)} ₺`)
        updatedCount++
      } else {
        console.log(`  ⚠️ ${item.product_name}: BOM bulunamadı, fiyat değiştirilmedi (${item.unit_price.toFixed(2)} ₺)`)
      }
    }
    
    // Sevkiyat toplamını yeniden hesapla
    const customer = db.prepare('SELECT discount_rate FROM accounts WHERE id = ?').get(shipment.customer_id)
    const discountRate = customer?.discount_rate || 0
    
    const shipmentItems = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ? AND deleted_at IS NULL').all(shipment.id)
    let totalAmount = 0
    for (const shipmentItem of shipmentItems) {
      totalAmount += shipmentItem.total_price || 0
    }
    
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    db.prepare(`
      UPDATE shipments 
      SET total_amount = ?, discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?
      WHERE id = ?
    `).run(totalAmount, discountRate, discountAmount, taxAmount, finalAmount, shipment.id)
    
    console.log(`  💰 Sevkiyat toplamı: ${totalAmount.toFixed(2)} ₺\n`)
  }
  
  console.log(`✅ Tamamlandı! ${updatedCount} kalem güncellendi`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
