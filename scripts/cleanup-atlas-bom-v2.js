const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

try {
  // PRD-127652 ürününü bul (korunacak)
  const keepProduct = db.prepare('SELECT id, name, sku FROM products WHERE sku = ?').get('PRD-127652');
  
  if (!keepProduct) {
    console.log('❌ PRD-127652 ürünü bulunamadı!');
    process.exit(1);
  }
  
  console.log(`✅ Korunacak ürün: ${keepProduct.name} (${keepProduct.sku}) - ID: ${keepProduct.id}`);
  
  // Tüm ATLAS ÜÇLÜ ürünlerini ve BOM durumlarını bul
  const allAtlasUclu = db.prepare(`
    SELECT 
      p.id, 
      p.name, 
      p.sku,
      COUNT(b.id) as bom_count
    FROM products p
    LEFT JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    WHERE LOWER(p.name) = 'atlas üçlü'
    GROUP BY p.id, p.name, p.sku
  `).all();
  
  console.log(`\n📋 Tüm ATLAS ÜÇLÜ ürünleri:`);
  allAtlasUclu.forEach((p, i) => {
    const isKeep = p.sku === 'PRD-127652';
    console.log(`   ${i + 1}. ${p.name} (${p.sku}) - BOM: ${p.bom_count} adet ${isKeep ? '✅ KORUNACAK' : '❌ SİLİNECEK'}`);
  });
  
  // PRD-127652 hariç tüm ATLAS ÜÇLÜ ürünlerinin BOM'larını sil
  let totalDeleted = 0;
  for (const product of allAtlasUclu) {
    if (product.sku === 'PRD-127652') {
      continue; // Bu ürünü atla
    }
    
    if (product.bom_count > 0) {
      // BOM kayıtlarını soft delete yap
      const deleted = db.prepare(`
        UPDATE bom 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND deleted_at IS NULL
      `).run(product.id);
      
      totalDeleted += deleted.changes;
      console.log(`\n   ✓ ${product.sku}: ${deleted.changes} BOM kaydı silindi`);
    }
  }
  
  console.log(`\n✅ Toplam ${totalDeleted} BOM kaydı silindi`);
  
  // Son kontrol: PRD-127652 için BOM
  const keepBomCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    WHERE b.product_id = ? AND b.deleted_at IS NULL
  `).get(keepProduct.id);
  
  console.log(`\n✅ PRD-127652 için ${keepBomCount.count} aktif BOM kaydı korunuyor`);
  
  // Diğer ATLAS ÜÇLÜ ürünlerinde kalan BOM kontrolü
  const remainingBom = db.prepare(`
    SELECT p.sku, COUNT(b.id) as bom_count
    FROM products p
    LEFT JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    WHERE LOWER(p.name) = 'atlas üçlü' AND p.sku != 'PRD-127652'
    GROUP BY p.sku
    HAVING COUNT(b.id) > 0
  `).all();
  
  if (remainingBom.length > 0) {
    console.log(`\n⚠️ Hala BOM'u olan ürünler:`);
    remainingBom.forEach(r => {
      console.log(`   - ${r.sku}: ${r.bom_count} BOM kaydı`);
    });
  } else {
    console.log(`\n✅ Tüm diğer ATLAS ÜÇLÜ ürünlerinin BOM'ları silindi`);
  }
  
} catch (error) {
  console.error('❌ Hata:', error);
  process.exit(1);
} finally {
  db.close();
}
