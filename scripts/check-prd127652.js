const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

try {
  const product = db.prepare('SELECT id, name, sku FROM products WHERE sku = ?').get('PRD-127652');
  
  if (!product) {
    console.log('❌ PRD-127652 bulunamadı!');
    process.exit(1);
  }
  
  console.log(`Ürün: ${product.name} (${product.sku}) - ID: ${product.id}\n`);
  
  // Aktif versiyonlarda BOM
  const activeBom = db.prepare(`
    SELECT COUNT(*) as count
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    WHERE b.product_id = ? AND b.deleted_at IS NULL
  `).get(product.id);
  
  console.log(`Aktif versiyon BOM: ${activeBom.count}`);
  
  // Tüm versiyonlarda BOM
  const allBom = db.prepare(`
    SELECT COUNT(*) as count
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    WHERE b.product_id = ? AND b.deleted_at IS NULL
  `).get(product.id);
  
  console.log(`Tüm versiyon BOM: ${allBom.count}`);
  
  // Versiyon detayları
  const versions = db.prepare(`
    SELECT bv.id, bv.version_no, bv.is_active, COUNT(b.id) as bom_count
    FROM bom_versions bv
    LEFT JOIN bom b ON b.version_id = bv.id AND b.deleted_at IS NULL
    WHERE bv.product_id = ? AND bv.deleted_at IS NULL
    GROUP BY bv.id, bv.version_no, bv.is_active
    ORDER BY bv.version_no DESC
  `).all(product.id);
  
  console.log(`\nVersiyonlar:`);
  versions.forEach(v => {
    console.log(`  Versiyon ${v.version_no} (Aktif: ${v.is_active}): ${v.bom_count} BOM`);
  });
  
  // BOM detayları
  if (allBom.count > 0) {
    const bomDetails = db.prepare(`
      SELECT b.id, m.name as material_name, b.quantity_required, bv.version_no, bv.is_active
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id
      JOIN materials m ON b.material_id = m.id
      WHERE b.product_id = ? AND b.deleted_at IS NULL
      LIMIT 5
    `).all(product.id);
    
    console.log(`\nBOM detayları:`);
    bomDetails.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.material_name} - ${b.quantity_required} (Versiyon ${b.version_no}, Aktif: ${b.is_active})`);
    });
  }
  
} catch (error) {
  console.error('❌ Hata:', error);
} finally {
  db.close();
}
