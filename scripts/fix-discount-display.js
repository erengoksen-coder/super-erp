const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  console.log('🚀 İskonto görünürlüğü düzeltiliyor...')
  
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
  
  // KUZEY MOBİLYA için iskonto oranını ayarla (örnek: %5)
  // Kullanıcı bu değeri cari hesap sayfasından ayarlayabilir, şimdilik 0 olarak bırakıyoruz
  // Eğer iskonto oranı varsa, buraya yazabilirsiniz:
  // db.prepare('UPDATE accounts SET discount_rate = ? WHERE code = ?').run(5, 'MUS-0001')
  
  // Tüm sevkiyatları güncelle
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${shipments.length} sevkiyat bulundu`)
  
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
    const totalAmount = shipment.total_amount || 0
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    // Sevkiyatı güncelle
    db.prepare(`
      UPDATE shipments 
      SET discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?
      WHERE id = ?
    `).run(discountRate, discountAmount, taxAmount, finalAmount, shipment.id)
    
    // Account transactions'ı güncelle
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ? AND deleted_at IS NULL').all(shipment.id)
    
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
      }
    }
  }
  
  // Tüm faturaları güncelle
  const invoices = db.prepare('SELECT * FROM invoices WHERE deleted_at IS NULL').all()
  console.log(`📄 Toplam ${invoices.length} fatura bulundu`)
  
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
    const totalAmount = invoice.total_amount || 0
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = invoice.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    // Faturayı güncelle
    db.prepare(`
      UPDATE invoices 
      SET discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?
      WHERE id = ?
    `).run(discountRate, discountAmount, taxAmount, finalAmount, invoice.id)
  }
  
  console.log('✅ Tamamlandı!')
  console.log('ℹ️ İskonto oranını cari hesap sayfasından ayarlayabilirsiniz')
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
