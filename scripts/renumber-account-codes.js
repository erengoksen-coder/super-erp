/**
 * Kayıtlı tüm carilerin kodlarını MUS-001, MUS-002, ... ve TED-001, TED-002, ... formatına çevirir.
 * Müşteriler (customer/musteri) -> MUS-001'den başlayarak
 * Tedarikçiler (supplier) -> TED-001'den başlayarak
 * Ayrıca orders.customer_code alanını yeni kodlarla günceller.
 *
 * Çalıştırma (proje kökünden):
 *   cd c:\super-erp
 *   node scripts/renumber-account-codes.js
 *
 * Farklı veritabanı için:
 *   set DATABASE_PATH=C:\yol\farkli\erp.db
 *   node scripts/renumber-account-codes.js
 *
 * Proje dışından tam yol ile:
 *   node c:\super-erp\scripts\renumber-account-codes.js
 */

const path = require('path')
// Proje köküne göre db-utils çözümle (script tam yolla çalıştırılsa da çalışsın)
const scriptDir = __dirname
const { openDatabase, assertDbExists } = require(path.join(scriptDir, 'db-utils'))

function main() {
  assertDbExists()
  const db = openDatabase()

  console.log('Cari kodları 001 formatına dönüştürülüyor...\n')

  // Müşteriler: type IN ('customer', 'musteri') - oluşturulma sırasına göre MUS-001, MUS-002, ...
  const customers = db.prepare(`
    SELECT id, code, name FROM accounts
    WHERE deleted_at IS NULL AND (type = 'customer' OR LOWER(TRIM(type)) = 'musteri')
    ORDER BY created_at ASC, id ASC
  `).all()

  // Tedarikçiler: type = 'supplier' veya benzeri
  const suppliers = db.prepare(`
    SELECT id, code, name FROM accounts
    WHERE deleted_at IS NULL AND (type = 'supplier' OR LOWER(TRIM(type)) = 'tedarikci')
    ORDER BY created_at ASC, id ASC
  `).all()

  const updateAccount = db.prepare('UPDATE accounts SET code = ? WHERE id = ?')
  const updateOrderCode = db.prepare('UPDATE orders SET customer_code = ? WHERE customer_code = ?')

  const pad3 = (n) => String(n).padStart(3, '0')

  let customerIndex = 1
  for (const acc of customers) {
    const newCode = `MUS-${pad3(customerIndex)}`
    if (acc.code !== newCode) {
      const oldCode = acc.code
      updateAccount.run(newCode, acc.id)
      if (oldCode) {
        const orderResult = updateOrderCode.run(newCode, oldCode)
        if (orderResult.changes > 0) {
          console.log(`  orders: customer_code ${oldCode} -> ${newCode} (${orderResult.changes} satır)`)
        }
      }
      console.log(`  ${acc.name || acc.id}: ${oldCode || '-'} -> ${newCode}`)
    }
    customerIndex++
  }

  let supplierIndex = 1
  for (const acc of suppliers) {
    const newCode = `TED-${pad3(supplierIndex)}`
    if (acc.code !== newCode) {
      console.log(`  ${acc.name || acc.id}: ${acc.code || '-'} -> ${newCode}`)
      updateAccount.run(newCode, acc.id)
    }
    supplierIndex++
  }

  console.log(`\nToplam: ${customers.length} müşteri, ${suppliers.length} tedarikçi güncellendi.`)
  console.log('Cari kodları 001 formatına dönüştürüldü.')
}

main()
