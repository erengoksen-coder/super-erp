const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
console.log('Veritabanı yolu:', dbPath);

const db = new Database(dbPath);

try {
  // 1. "ATLAS ÜÇLÜ" içeren tüm ürünleri bul
  console.log('\n=== 1. ATLAS ÜÇLÜ İÇEREN ÜRÜNLER ===');
  const products = db.prepare(`
    SELECT id, name, sku 
    FROM products 
    WHERE LOWER(name) LIKE '%atlas%' AND LOWER(name) LIKE '%üçlü%'
    OR LOWER(name) LIKE '%atlas%' AND LOWER(name) LIKE '%uclu%'
  `).all();
  console.log('Bulunan ürünler:', JSON.stringify(products, null, 2));

  // 2. Bu ürünler için BOM kontrolü
  console.log('\n=== 2. BOM KONTROLÜ ===');
  for (const product of products) {
    const bomCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).get(product.id);
    
    const bomCountActive = db.prepare(`
      SELECT COUNT(*) as count
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).get(product.id);

    console.log(`\nÜrün: ${product.name} (ID: ${product.id})`);
    console.log(`  - Toplam BOM kaydı: ${bomCount.count}`);
    console.log(`  - Aktif versiyon BOM kaydı: ${bomCountActive.count}`);
    
    if (bomCount.count > 0) {
      const bomItems = db.prepare(`
        SELECT b.id, m.name as material_name, b.quantity_required, bv.version_no, bv.is_active
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
        LIMIT 5
      `).all(product.id);
      console.log(`  - BOM örnekleri:`, JSON.stringify(bomItems, null, 2));
    }
  }

  // 3. Tüm "ÜÇLÜ" içeren ürünlerde BOM ara
  console.log('\n=== 3. TÜM "ÜÇLÜ" İÇEREN ÜRÜNLERDE BOM ARAMA ===');
  const allUcluProducts = db.prepare(`
    SELECT DISTINCT p.id, p.name, p.sku, COUNT(b.id) as bom_count
    FROM products p
    LEFT JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    LEFT JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    WHERE (LOWER(p.name) LIKE '%üçlü%' OR LOWER(p.name) LIKE '%uclu%')
    GROUP BY p.id, p.name, p.sku
    HAVING COUNT(b.id) > 0
    ORDER BY COUNT(b.id) DESC
    LIMIT 10
  `).all();
  console.log('BOM\'u olan "ÜÇLÜ" ürünleri:', JSON.stringify(allUcluProducts, null, 2));

  // 4. Belirli product_id için test (dd2629ff-f94c-416f-a0a5-529fc494f7af)
  console.log('\n=== 4. BELİRLİ PRODUCT ID İÇİN TEST ===');
  const testProductId = 'dd2629ff-f94c-416f-a0a5-529fc494f7af';
  const testProduct = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(testProductId);
  if (testProduct) {
    console.log('Test ürünü:', JSON.stringify(testProduct, null, 2));
    const testBom = db.prepare(`
      SELECT COUNT(*) as count
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).get(testProductId);
    console.log(`BOM sayısı: ${testBom.count}`);
  } else {
    console.log('Test ürünü bulunamadı!');
  }

} catch (error) {
  console.error('Hata:', error);
} finally {
  db.close();
}
