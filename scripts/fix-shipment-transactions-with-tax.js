const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  console.log('🚀 Sevkiyat account transactions KDV dahil tutarla güncelleniyor...\n')
  
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
    
    const totalAmount = shipment.total_amount || 0
    const discountRate = shipment.discount_rate || 0
    const discountAmount = shipment.discount_amount || 0
    const amountAfterDiscount = totalAmount - discountAmount
    const taxRate = shipment.tax_rate || 0
    const taxAmount = shipment.tax_amount || 0
    
    console.log(`📄 ${shipment.shipment_number}:`)
    console.log(`  Ara Toplam: ${totalAmount.toFixed(2)} ₺`)
    console.log(`  İskonto: ${discountAmount.toFixed(2)} ₺`)
    console.log(`  İskonto Sonrası: ${amountAfterDiscount.toFixed(2)} ₺`)
    console.log(`  KDV: ${taxAmount.toFixed(2)} ₺`)
    console.log(`  Genel Toplam: ${shipment.final_amount.toFixed(2)} ₺\n`)
    
    for (const item of items) {
      // Kalem bazında iskonto ve KDV hesapla
      const itemTotal = item.total_price || 0
      const itemDiscountAmount = (itemTotal * discountRate) / 100
      const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
      const itemTaxAmount = amountAfterDiscount > 0 ? (itemAmountAfterDiscount / amountAfterDiscount) * taxAmount : 0
      const itemFinalAmount = itemAmountAfterDiscount + itemTaxAmount
      
      // Account transaction'ı bul ve güncelle
      const transaction = db.prepare(`
        SELECT * FROM account_transactions 
        WHERE reference_id = ? AND reference_type = 'shipment_item'
      `).get(item.id)
      
      if (transaction) {
        // Açıklamayı güncelle
        let description = `Sevkiyat: ${shipment.shipment_number} | Ürün: ${item.product_name}${item.product_sku ? ` (${item.product_sku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${item.unit_price.toFixed(2)} ₺`
        
        if (discountRate > 0 && itemDiscountAmount > 0) {
          description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
        }
        
        if (taxRate > 0 && itemTaxAmount > 0) {
          description += ` | KDV: %${taxRate.toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
        }
        
        description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`
        
        // Transaction'ı güncelle
        db.prepare(`
          UPDATE account_transactions 
          SET amount = ?, description = ?
          WHERE id = ?
        `).run(itemFinalAmount, description, transaction.id)
        
        console.log(`  ✅ ${item.product_name}: ${transaction.amount.toFixed(2)} ₺ → ${itemFinalAmount.toFixed(2)} ₺`)
        updatedCount++
      }
    }
    
    // Müşteri bakiyesini yeniden hesapla
    const allTransactions = db.prepare(`
      SELECT transaction_type, amount 
      FROM account_transactions 
      WHERE account_id = ?
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
    
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(balance, shipment.customer_id)
    console.log(`  💰 Müşteri bakiyesi: ${balance.toFixed(2)} ₺\n`)
  }
  
  console.log(`✅ Tamamlandı! ${updatedCount} account transaction güncellendi`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
