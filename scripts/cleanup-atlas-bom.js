const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

try {
  // PRD-127652 ürününü bul
  const keepProduct = db.prepare('SELECT id, name, sku FROM products WHERE sku = ?').get('PRD-127652');
  
  if (!keepProduct) {
    console.log('❌ PRD-127652 ürünü bulunamadı!');
    process.exit(1);
  }
  
  console.log(`✅ Korunacak ürün: ${keepProduct.name} (${keepProduct.sku}) - ID: ${keepProduct.id}`);
  
  // Tüm ATLAS ÜÇLÜ ürünlerini bul (PRD-127652 hariç)
  const allAtlasUclu = db.prepare(`
    SELECT id, name, sku 
    FROM products 
    WHERE LOWER(name) = 'atlas üçlü' AND sku != ?
  `).all('PRD-127652');
  
  console.log(`\n📋 Silinecek ${allAtlasUclu.length} ürün bulundu:`);
  allAtlasUclu.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (${p.sku}) - ID: ${p.id}`);
  });
  
  // Her ürün için BOM kayıtlarını sil
  let totalDeleted = 0;
  for (const product of allAtlasUclu) {
    // Önce BOM kayıtlarını say
    const bomCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM bom b
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).get(product.id);
    
    if (bomCount.count > 0) {
      // BOM kayıtlarını soft delete yap
      const deleted = db.prepare(`
        UPDATE bom 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND deleted_at IS NULL
      `).run(product.id);
      
      totalDeleted += deleted.changes;
      console.log(`   ✓ ${product.sku}: ${deleted.changes} BOM kaydı silindi`);
    } else {
      console.log(`   - ${product.sku}: BOM kaydı yok`);
    }
  }
  
  console.log(`\n✅ Toplam ${totalDeleted} BOM kaydı silindi`);
  
  // PRD-127652 için BOM kontrolü
  const keepBomCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    WHERE b.product_id = ? AND b.deleted_at IS NULL
  `).get(keepProduct.id);
  
  console.log(`\n✅ PRD-127652 için ${keepBomCount.count} aktif BOM kaydı korunuyor`);
  
} catch (error) {
  console.error('❌ Hata:', error);
  process.exit(1);
} finally {
  db.close();
}
