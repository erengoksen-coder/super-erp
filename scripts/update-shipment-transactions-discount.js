const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  console.log('🚀 Account transactions iskonto bilgisi güncelleniyor...')
  
  // Tüm sevkiyatları al
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  console.log(`📦 Toplam ${shipments.length} sevkiyat bulundu`)
  
  let updatedCount = 0
  
  for (const shipment of shipments) {
    const customer = db.prepare('SELECT id, name, discount_rate FROM accounts WHERE id = ?').get(shipment.customer_id)
    
    if (!customer) continue
    
    const discountRate = customer.discount_rate || 0
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
        
        updatedCount++
      }
    }
  }
  
  console.log(`✅ ${updatedCount} account transaction güncellendi`)
  
} catch (error) {
  console.error('❌ Hata:', error.message)
} finally {
  db.close()
}
