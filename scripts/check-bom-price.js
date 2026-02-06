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

try {
  console.log('🔍 ATLAS ÜÇLÜ BOM fiyatı kontrol ediliyor...\n')
  
  // Tüm ATLAS ÜÇLÜ ürünlerini bul
  const products = db.prepare('SELECT id, name, sku FROM active_products WHERE name LIKE ?').all('%ATLAS ÜÇLÜ%')
  
  for (const product of products) {
    console.log(`\n📦 Ürün: ${product.name} (${product.sku}) - ID: ${product.id}`)
    
    // Aktif BOM versiyonunu bul
    let bomItems = db.prepare(`
      SELECT 
        b.quantity_required as quantity,
        b.unit as unit,
        b.fire_percentage,
        m.unit_price,
        m.name as material_name,
        m.unit as material_unit,
        m.id as material_id
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      JOIN materials m ON b.material_id = m.id
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).all(product.id)
    
    if (bomItems.length === 0) {
      console.log('  ⚠️ Aktif BOM versiyonu bulunamadı, tüm versiyonlarda aranıyor...')
      bomItems = db.prepare(`
        SELECT 
          b.quantity_required as quantity,
          b.unit as unit,
          b.fire_percentage,
          m.unit_price,
          m.name as material_name,
          m.unit as material_unit,
          m.id as material_id
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
        ORDER BY bv.version_no DESC
        LIMIT 100
      `).all(product.id)
    }
    
    if (bomItems.length === 0) {
      console.log('  ❌ BOM bulunamadı')
      continue
    }
    
    console.log(`  ✅ ${bomItems.length} BOM kalemi bulundu:\n`)
    
    let totalCost = 0
    for (const item of bomItems) {
      const quantityWithFire = item.quantity * (1 + (item.fire_percentage || 0) / 100)
      const fromUnit = (item.unit || item.material_unit || '').toString()
      const toUnit = (item.material_unit || '').toString()
      const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
      const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
      const materialUnitPrice = item.unit_price || 0
      const itemCost = convertedQuantity * materialUnitPrice
      totalCost += itemCost
      
      console.log(`  - ${item.material_name}:`)
      console.log(`    Miktar: ${item.quantity} ${item.unit || item.material_unit}`)
      console.log(`    Fire: ${item.fire_percentage || 0}%`)
      console.log(`    Fire sonrası: ${quantityWithFire.toFixed(4)} ${item.unit || item.material_unit}`)
      console.log(`    Birim dönüşüm: ${fromUnit} → ${toUnit} (faktör: ${factor})`)
      console.log(`    Dönüştürülmüş miktar: ${convertedQuantity.toFixed(4)} ${toUnit}`)
      console.log(`    Birim fiyat: ${materialUnitPrice.toFixed(2)} ₺`)
      console.log(`    Kalem maliyeti: ${itemCost.toFixed(2)} ₺\n`)
    }
    
    console.log(`  💰 TOPLAM BOM FİYATI: ${totalCost.toFixed(2)} ₺\n`)
  }
  
} catch (error) {
  console.error('❌ Hata:', error.message)
  console.error(error.stack)
} finally {
  db.close()
}
