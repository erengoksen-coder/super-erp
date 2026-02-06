const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  // discount_rate kolonunu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0')
    console.log('discount_rate kolonu eklendi')
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      throw e
    }
    console.log('discount_rate kolonu zaten var')
  }

  const shipment = db.prepare('SELECT * FROM shipments WHERE shipment_number = ?').get('SEVK-20260204-0001')
  
  if (shipment) {
    const customer = db.prepare('SELECT id, name, discount_rate, balance FROM accounts WHERE id = ?').get(shipment.customer_id)
    console.log('Customer:', customer)
    
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(shipment.id)
    
    let totalAmount = 0
    
    for (const item of items) {
      const discountRate = customer.discount_rate || 0
      const itemTotal = item.total_price || 0
      const itemDiscountAmount = (itemTotal * discountRate) / 100
      const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
      
      totalAmount += itemAmountAfterDiscount
      
      const transaction = db.prepare('SELECT * FROM account_transactions WHERE reference_id = ? AND reference_type = ?').get(item.id, 'shipment_item')
      
      if (transaction) {
        console.log(`Updating transaction: ${transaction.id}, amount: ${itemAmountAfterDiscount.toFixed(2)}`)
        const description = `Sevkiyat: ${shipment.shipment_number} | Ürün: ATLAS ÜÇLÜ (PRD-373231) | Adet: ${item.quantity} | Birim Fiyat (BOM): ${item.unit_price.toFixed(2)} ₺ | Toplam: ${itemAmountAfterDiscount.toFixed(2)} ₺`
        db.prepare('UPDATE account_transactions SET amount = ?, description = ? WHERE id = ?').run(
          itemAmountAfterDiscount,
          description,
          transaction.id
        )
      }
    }
    
    // Müşteri bakiyesini güncelle
    const currentBalance = customer.balance || 0
    const newBalance = currentBalance + totalAmount
    console.log(`Updating customer balance: ${currentBalance.toFixed(2)} -> ${newBalance.toFixed(2)}`)
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?').run(newBalance, shipment.customer_id)
    
    console.log('✅ Sevkiyat işlemleri güncellendi')
  } else {
    console.log('Sevkiyat bulunamadı')
  }
} catch (error) {
  console.error('Hata:', error.message)
} finally {
  db.close()
}
