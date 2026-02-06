const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

// resolveUnitFactor fonksiyonunu basitleştirilmiş hali
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
  console.log('🚀 Fatura kalemleri fiyatları güncelleniyor...')
  
  // discount_rate kolonunu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0')
    console.log('✅ discount_rate kolonu eklendi')
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      throw e
    }
    console.log('ℹ️ discount_rate kolonu zaten var')
  }
  
  // Tüm faturaları al
  const invoices = db.prepare('SELECT * FROM invoices WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${invoices.length} fatura bulundu`)
  
  let updatedCount = 0
  
  for (const invoice of invoices) {
    // Müşteri bilgilerini al
    let customer
    try {
      customer = db.prepare('SELECT id, name, discount_rate FROM accounts WHERE id = ?').get(invoice.customer_id)
    } catch (e) {
      if (e.message?.includes('no such column: discount_rate')) {
        customer = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(invoice.customer_id)
        if (customer) {
          customer.discount_rate = 0
        }
      } else {
        throw e
      }
    }
    
    if (!customer) continue
    
    const discountRate = customer.discount_rate || 0
    
    const items = db.prepare(`
      SELECT ii.*, p.name as product_name, p.sku as product_sku
      FROM invoice_items ii
      JOIN active_products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ? AND ii.deleted_at IS NULL
    `).all(invoice.id)
    
    let invoiceTotalAmount = 0
    
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
              console.log(`[Fatura BOM] Fallback: ${product.name} (${product.id}) → ${fallbackProduct.name} (${fallbackProduct.id})`)
              
              bomItems = db.prepare(`
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
              `).all(fallbackProduct.id)
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
        bomCost += convertedQuantity * materialUnitPrice
      }
      
      // BOM maliyeti varsa kullan, yoksa mevcut unit_price'ı kullan, o da yoksa selling_price kullan
      let unitPrice = bomCost > 0 ? bomCost : (item.unit_price && item.unit_price > 0 ? item.unit_price : (() => {
        const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id)
        return product?.selling_price || 0
      })())
      
      const totalPrice = unitPrice * (item.quantity || 0)
      
      // İskonto hesapla (müşteri iskonto oranı döngü dışında alındı)
      const itemDiscountAmount = (totalPrice * discountRate) / 100
      const itemTotalAfterDiscount = totalPrice - itemDiscountAmount
      const itemUnitPriceAfterDiscount = item.quantity > 0 ? itemTotalAfterDiscount / item.quantity : 0
      
      // Fatura kalemini güncelle
      db.prepare(`
        UPDATE invoice_items 
        SET unit_price = ?, total_price = ?
        WHERE id = ?
      `).run(itemUnitPriceAfterDiscount, itemTotalAfterDiscount, item.id)
      
      invoiceTotalAmount += totalPrice // İskonto öncesi toplam
      updatedCount++
      
      if (bomCost > 0) {
        console.log(`✅ ${item.product_name}: BOM fiyatı ${bomCost.toFixed(2)} ₺, İskonto sonrası: ${itemTotalAfterDiscount.toFixed(2)} ₺`)
      }
    }
    
    // Fatura toplamlarını güncelle (müşteri bilgileri zaten yukarıda alındı)
    const discountAmount = (invoiceTotalAmount * discountRate) / 100
    const amountAfterDiscount = invoiceTotalAmount - discountAmount
    const taxRate = invoice.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    db.prepare(`
      UPDATE invoices 
      SET total_amount = ?, discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?
      WHERE id = ?
    `).run(invoiceTotalAmount, discountRate, discountAmount, taxAmount, finalAmount, invoice.id)
    
    console.log(`📄 ${invoice.invoice_number}: Toplam ${invoiceTotalAmount.toFixed(2)} ₺, İskonto ${discountAmount.toFixed(2)} ₺, Final ${finalAmount.toFixed(2)} ₺`)
  }
  
  console.log(`\n✅ Tamamlandı! ${updatedCount} fatura kalemi güncellendi`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
