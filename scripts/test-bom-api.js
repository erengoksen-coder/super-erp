const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

// findBomProductIdByName fonksiyonunu simüle et
function findBomProductIdByName(db, name, excludeId) {
  if (!name) return null;
  
  const extractProductName = (fullName) => {
    if (fullName.includes(' - ')) {
      const parts = fullName.split(' - ');
      return parts[parts.length - 1].trim();
    }
    const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i);
    if (skuMatch) {
      return skuMatch[1].trim();
    }
    return fullName.trim();
  };
  
  const productNameOnly = extractProductName(name);
  
  // Önce aktif versiyonlarda tam eşleşme
  let row = db.prepare(`
    SELECT p.id as id
    FROM products p
    JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    WHERE p.name = ? AND p.id != ?
    GROUP BY p.id
    ORDER BY COUNT(b.id) DESC
    LIMIT 1
  `).get(name, excludeId);
  
  if (row) return row.id;
  
  // Aktif versiyonlarda yoksa, tüm versiyonlarda ara
  row = db.prepare(`
    SELECT p.id as id
    FROM products p
    JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    WHERE p.name = ? AND p.id != ?
    GROUP BY p.id
    ORDER BY COUNT(b.id) DESC
    LIMIT 1
  `).get(name, excludeId);
  
  if (row) return row.id;
  
  // Ürün adı kısmı ile eşleştir
  if (productNameOnly && productNameOnly !== name) {
    row = db.prepare(`
      SELECT p.id as id
      FROM products p
      JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE (
        p.name LIKE ? OR 
        p.name LIKE ? OR
        (p.name LIKE ? AND p.name NOT LIKE ?)
      ) AND p.id != ?
      GROUP BY p.id
      ORDER BY COUNT(b.id) DESC
      LIMIT 1
    `).get(
      `%${productNameOnly}%`,
      `% - ${productNameOnly}%`,
      `%${productNameOnly}%`,
      `% - %${productNameOnly}%`,
      excludeId
    );
    
    if (row) {
      console.log(`[EŞLEŞTİRME] Ürün adı kısmı ile bulundu: ${name} -> ${productNameOnly}`);
      return row.id;
    }
  }
  
  return null;
}

try {
  // Test: PRD-373231 (BOM'u olmayan) için eşleştirme
  console.log('\n=== TEST: PRD-373231 İÇİN BOM EŞLEŞTİRME ===');
  const testProduct = db.prepare('SELECT id, name, sku FROM products WHERE sku = ?').get('PRD-373231');
  
  if (testProduct) {
    console.log('Test ürünü:', testProduct);
    
    // findBomProductIdByName ile eşleştirme
    const matchedId = findBomProductIdByName(db, testProduct.name, testProduct.id);
    
    if (matchedId) {
      const matchedProduct = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(matchedId);
      console.log(`\n✅ EŞLEŞTİRME BAŞARILI!`);
      console.log(`   Orijinal: ${testProduct.name} (${testProduct.sku})`);
      console.log(`   Eşleşen: ${matchedProduct.name} (${matchedProduct.sku})`);
      
      // Eşleşen ürün için BOM kontrolü
      const bomCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).get(matchedId);
      
      console.log(`   BOM sayısı: ${bomCount.count}`);
    } else {
      console.log('\n❌ EŞLEŞTİRME BAŞARISIZ!');
    }
  }
  
  // Anahtar kelime tabanlı arama testi
  console.log('\n=== TEST: ANAHTAR KELİME TABANLI ARAMA ===');
  const testProductId = 'dd2629ff-f94c-416f-a0a5-529fc494f7af';
  const product = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(testProductId);
  
  if (product) {
    const productNameLower = product.name.toLowerCase();
    const keywords = productNameLower
      .split(/\s+/)
      .filter(word => word.length > 2 && !word.match(/^(prd|-\d+)$/i))
      .slice(0, 3);
    
    console.log('Ürün:', product.name);
    console.log('Anahtar kelimeler:', keywords);
    
    if (keywords.length > 0) {
      const placeholders = keywords.map(() => 'LOWER(p.name) LIKE ?').join(' OR ');
      const params = [testProductId, ...keywords.map(k => `%${k}%`)];
      
      const results = db.prepare(`
        SELECT DISTINCT p.id, p.name, p.sku, COUNT(b.id) as bom_count
        FROM products p
        JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
        WHERE p.id != ? AND (
          ${placeholders}
        )
        GROUP BY p.id, p.name, p.sku
        HAVING COUNT(b.id) > 0
        ORDER BY COUNT(b.id) DESC
        LIMIT 5
      `).all(...params);
      
      if (results.length > 0) {
        console.log(`\n✅ ${results.length} eşleşme bulundu:`);
        results.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.name} (${r.sku}) - BOM: ${r.bom_count} adet`);
        });
      } else {
        console.log('\n❌ Eşleşme bulunamadı!');
      }
    }
  }

} catch (error) {
  console.error('Hata:', error);
} finally {
  db.close();
}
