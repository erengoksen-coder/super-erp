const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  // Kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN discount_rate REAL DEFAULT 0')
    console.log('discount_rate kolonu eklendi')
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      throw e
    }
    console.log('discount_rate kolonu zaten var')
  }
  
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN discount_amount REAL DEFAULT 0')
    console.log('discount_amount kolonu eklendi')
  } catch (e) {
    if (!e.message.includes('duplicate column')) {
      throw e
    }
    console.log('discount_amount kolonu zaten var')
  }

  // Tüm sevkiyatları güncelle
  const shipments = db.prepare('SELECT * FROM shipments WHERE deleted_at IS NULL').all()
  
  for (const shipment of shipments) {
    const customer = db.prepare('SELECT id, discount_rate FROM accounts WHERE id = ?').get(shipment.customer_id)
    
    if (customer) {
      const discountRate = customer.discount_rate || 0
      const totalAmount = shipment.total_amount || 0
      const discountAmount = (totalAmount * discountRate) / 100
      const amountAfterDiscount = totalAmount - discountAmount
      const taxRate = shipment.tax_rate || 0
      const taxAmount = (amountAfterDiscount * taxRate) / 100
      const finalAmount = amountAfterDiscount + taxAmount
      
      console.log(`Updating shipment ${shipment.shipment_number}: discount_rate=${discountRate}, discount_amount=${discountAmount.toFixed(2)}`)
      
      db.prepare(`
        UPDATE shipments 
        SET discount_rate = ?, 
            discount_amount = ?,
            final_amount = ?,
            tax_amount = ?
        WHERE id = ?
      `).run(discountRate, discountAmount, finalAmount, taxAmount, shipment.id)
    }
  }
  
  console.log('✅ Sevkiyat iskontoları güncellendi')
} catch (error) {
  console.error('Hata:', error.message)
} finally {
  db.close()
}
