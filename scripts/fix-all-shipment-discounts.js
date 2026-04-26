const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  console.log('🚀 Tüm sevkiyatlar için iskonto hesaplama başlatılıyor...')
  
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
  
  // Tüm sevkiyatları al
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${shipments.length} sevkiyat bulundu`)
  
  let updatedCount = 0
  let transactionUpdatedCount = 0
  
  for (const shipment of shipments) {
    // discount_rate kolonu yoksa 0 olarak kabul et
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
    
    if (!customer) {
      console.warn(`⚠️ Müşteri bulunamadı: ${shipment.customer_id}`)
      continue
    }
    
    const discountRate = customer.discount_rate || 0
    const totalAmount = shipment.total_amount || 0
    
    // İskonto hesapla
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount
    
    // Sevkiyatı güncelle
    db.prepare(`
      UPDATE shipments 
      SET discount_rate = ?, 
          discount_amount = ?,
          tax_amount = ?,
          final_amount = ?
      WHERE id = ?
    `).run(discountRate, discountAmount, taxAmount, finalAmount, shipment.id)
    
    if (discountRate > 0) {
      updatedCount++
      console.log(`✅ ${shipment.shipment_number}: İskonto %${discountRate.toFixed(2)} = ${discountAmount.toFixed(2)} ₺`)
    }
    
    // Account transactions'ı güncelle
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ? AND deleted_at IS NULL').all(shipment.id)
    
    for (const item of items) {
      const itemTotal = item.total_price || 0
      const itemDiscountAmount = (itemTotal * discountRate) / 100
      const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
      
      // Account transaction'ı bul ve güncelle
      const transaction = db.prepare(`
        SELECT * FROM account_transactions 
        WHERE reference_id = ? AND reference_type = 'shipment_item'
      `).get(item.id)
      
      if (transaction) {
        // Açıklamayı güncelle (iskonto bilgisi ile)
        const product = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(item.product_id)
        const productName = product?.name || 'Ürün'
        const productSku = product?.sku || ''
        
        let description = `Sevkiyat: ${shipment.shipment_number} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${item.unit_price.toFixed(2)} ₺`
        
        if (discountRate > 0 && itemDiscountAmount > 0) {
          description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
        }
        
        description += ` | Toplam: ${itemAmountAfterDiscount.toFixed(2)} ₺`
        
        // Transaction'ı güncelle
        db.prepare(`
          UPDATE account_transactions 
          SET amount = ?, description = ?
          WHERE id = ?
        `).run(itemAmountAfterDiscount, description, transaction.id)
        
        transactionUpdatedCount++
      }
    }
    
    // Müşteri bakiyesini yeniden hesapla
    const allTransactions = db.prepare(`
      SELECT transaction_type, amount 
      FROM account_transactions 
      WHERE account_id = ? AND reference_type = 'shipment_item'
      ORDER BY created_at ASC
    `).all(shipment.customer_id)
    
    let balance = 0
    for (const txn of allTransactions) {
      if (txn.transaction_type === 'debit') {
        balance += txn.amount
      } else if (txn.transaction_type === 'credit') {
        balance -= txn.amount
      }
    }
    
    // Müşteri bakiyesini güncelle
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(balance, shipment.customer_id)
  }
  
  console.log(`\n✅ Tamamlandı!`)
  console.log(`📊 ${updatedCount} sevkiyat için iskonto uygulandı`)
  console.log(`💳 ${transactionUpdatedCount} account transaction güncellendi`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
