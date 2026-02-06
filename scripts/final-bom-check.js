const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

try {
  console.log('=== ATLAS ÜÇLÜ ÜRÜNLERİ VE BOM DURUMLARI ===\n');
  
  const result = db.prepare(`
    SELECT 
      p.sku, 
      p.name, 
      COUNT(b.id) as bom_count
    FROM products p
    LEFT JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    LEFT JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    WHERE LOWER(p.name) = 'atlas üçlü'
    GROUP BY p.sku, p.name
    ORDER BY p.sku
  `).all();
  
  result.forEach((r, i) => {
    const status = r.sku === 'PRD-127652' ? '✅ KORUNUYOR' : (r.bom_count > 0 ? '❌ SİLİNMELİ' : '✓ SİLİNDİ');
    console.log(`${i + 1}. ${r.sku}: ${r.bom_count} BOM ${status}`);
  });
  
  const prd127652 = result.find(r => r.sku === 'PRD-127652');
  const others = result.filter(r => r.sku !== 'PRD-127652' && r.bom_count > 0);
  
  console.log(`\n✅ PRD-127652 için ${prd127652?.bom_count || 0} BOM kaydı korunuyor`);
  
  if (others.length > 0) {
    console.log(`\n⚠️ Hala BOM'u olan diğer ürünler:`);
    others.forEach(r => console.log(`   - ${r.sku}: ${r.bom_count} BOM`));
  } else {
    console.log(`\n✅ Tüm diğer ATLAS ÜÇLÜ ürünlerinin BOM'ları temizlendi`);
  }
  
} catch (error) {
  console.error('❌ Hata:', error);
} finally {
  db.close();
}
