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
  console.log('🚀 Tüm iskontolar yeniden hesaplanıyor...')
  
  // Tüm sevkiyatları güncelle
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${shipments.length} sevkiyat bulundu`)
  
  let shipmentUpdatedCount = 0
  let transactionUpdatedCount = 0
  
  for (const shipment of shipments) {
    let customer
    try {
      customer = db.prepare('SELECT id, name, discount_rate FROM accounts WHERE id = ?').get(shipment.customer_id)
    } catch (e) {
      if (e.message?.includes('no such column: discount_rate')) {
        customer = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(shipment.customer_id)
        if (customer) {
          customer.discount_rate = 0
        }
      } else {
        throw e
      }
    }
    
    if (!customer) continue
    
    const discountRate = customer.discount_rate || 0
    
    // total_amount'ı shipment_items'dan yeniden hesapla (BOM fiyatları toplamı)
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ? AND deleted_at IS NULL').all(shipment.id)
    let totalAmount = 0
    for (const item of items) {
      // item.total_price zaten BOM fiyatı (iskonto öncesi)
      totalAmount += item.total_price || 0
    }
    
    // Eğer total_amount 0 ise, mevcut değeri kullan
    if (totalAmount === 0) {
      totalAmount = shipment.total_amount || 0
    }
    
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    // Sevkiyatı güncelle (total_amount'ı da güncelle)
    db.prepare(`
      UPDATE shipments 
      SET total_amount = ?, discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?
      WHERE id = ?
    `).run(totalAmount, discountRate, discountAmount, taxAmount, finalAmount, shipment.id)
    
    if (discountRate > 0) {
      shipmentUpdatedCount++
      console.log(`✅ ${shipment.shipment_number}: İskonto %${discountRate.toFixed(2)} = ${discountAmount.toFixed(2)} ₺`)
    }
    
    // Account transactions'ı güncelle (items zaten yukarıda alındı)
    
    for (const item of items) {
      const itemTotal = item.total_price || 0
      const itemDiscountAmount = (itemTotal * discountRate) / 100
      const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
      
      const transaction = db.prepare(`
        SELECT * FROM account_transactions 
        WHERE reference_id = ? AND reference_type = 'shipment_item'
      `).get(item.id)
      
      if (transaction) {
        const product = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(item.product_id)
        const productName = product?.name || 'Ürün'
        const productSku = product?.sku || ''
        
        let description = `Sevkiyat: ${shipment.shipment_number} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${item.unit_price.toFixed(2)} ₺`
        
        if (discountRate > 0 && itemDiscountAmount > 0) {
          description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
        }
        
        description += ` | Toplam: ${itemAmountAfterDiscount.toFixed(2)} ₺`
        
        db.prepare(`
          UPDATE account_transactions 
          SET amount = ?, description = ?
          WHERE id = ?
        `).run(itemAmountAfterDiscount, description, transaction.id)
        
        transactionUpdatedCount++
      }
    }
  }
  
  // Tüm faturaları güncelle
  const invoices = db.prepare('SELECT * FROM invoices WHERE deleted_at IS NULL').all()
  console.log(`📄 Toplam ${invoices.length} fatura bulundu`)
  
  let invoiceUpdatedCount = 0
  
  for (const invoice of invoices) {
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
    
    // Fatura kalemlerini al ve BOM fiyatlarını hesapla
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
      
      // Eğer aktif versiyonda BOM bulunamadıysa, tüm versiyonlarda ara
      if (bomItems.length === 0) {
        bomItems = db.prepare(`
          SELECT 
            b.quantity_required as quantity,
            b.unit as unit,
            b.fire_percentage,
            m.unit_price,
            m.unit as material_unit,
            m.id as material_id
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
          ORDER BY bv.version_no DESC
          LIMIT 100
        `).all(item.product_id)
      }
      
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
              bomItems = db.prepare(`
                SELECT 
                  b.quantity_required as quantity,
                  b.unit as unit,
                  b.fire_percentage,
                  m.unit_price,
                  m.unit as material_unit,
                  m.id as material_id
                FROM bom b
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
                JOIN materials m ON b.material_id = m.id
                WHERE b.product_id = ? AND b.deleted_at IS NULL
                ORDER BY bv.version_no DESC
                LIMIT 100
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
      
      // BOM maliyeti varsa kullan, yoksa mevcut unit_price'ı kullan
      let unitPrice = bomCost > 0 ? bomCost : (item.unit_price && item.unit_price > 0 ? item.unit_price : 0)
      const totalPrice = unitPrice * (item.quantity || 0)
      
      invoiceTotalAmount += totalPrice
      
      // İskonto hesapla
      const itemDiscountAmount = (totalPrice * discountRate) / 100
      const itemTotalAfterDiscount = totalPrice - itemDiscountAmount
      const itemUnitPriceAfterDiscount = item.quantity > 0 ? itemTotalAfterDiscount / item.quantity : 0
      
      // Fatura kalemini güncelle
      db.prepare(`
        UPDATE invoice_items 
        SET unit_price = ?, total_price = ?
        WHERE id = ?
      `).run(itemUnitPriceAfterDiscount, itemTotalAfterDiscount, item.id)
    }
    
    // Fatura toplamlarını güncelle
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
    
    if (discountRate > 0) {
      invoiceUpdatedCount++
      console.log(`✅ ${invoice.invoice_number}: İskonto %${discountRate.toFixed(2)} = ${discountAmount.toFixed(2)} ₺`)
    }
  }
  
  // Müşteri bakiyelerini yeniden hesapla
  console.log('\n💰 Müşteri bakiyeleri yeniden hesaplanıyor...')
  const accounts = db.prepare('SELECT id FROM accounts WHERE type = ? AND deleted_at IS NULL').all('customer')
  
  for (const account of accounts) {
    const allTransactions = db.prepare(`
      SELECT transaction_type, amount 
      FROM account_transactions 
      WHERE account_id = ?
      ORDER BY created_at ASC
    `).all(account.id)
    
    let balance = 0
    for (const txn of allTransactions) {
      if (txn.transaction_type === 'debit') {
        balance += txn.amount
      } else if (txn.transaction_type === 'credit') {
        balance -= txn.amount
      }
    }
    
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(balance, account.id)
  }
  
  console.log(`\n✅ Tamamlandı!`)
  console.log(`📊 ${shipmentUpdatedCount} sevkiyat için iskonto uygulandı`)
  console.log(`💳 ${transactionUpdatedCount} account transaction güncellendi`)
  console.log(`📄 ${invoiceUpdatedCount} fatura için iskonto uygulandı`)
  console.log(`💰 Tüm müşteri bakiyeleri yeniden hesaplandı`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
