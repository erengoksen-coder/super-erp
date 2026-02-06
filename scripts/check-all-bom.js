const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

try {
  // Tüm BOM kayıtlarını ve ürünlerini listele
  console.log('\n=== TÜM BOM KAYITLARI ===');
  const allBom = db.prepare(`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku as product_sku,
      COUNT(b.id) as bom_count,
      bv.version_no,
      bv.is_active
    FROM products p
    JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    GROUP BY p.id, p.name, p.sku, bv.version_no, bv.is_active
    ORDER BY p.name, bv.version_no DESC
  `).all();
  
  console.log(`Toplam ${allBom.length} BOM kaydı bulundu:\n`);
  allBom.forEach((item, index) => {
    console.log(`${index + 1}. ${item.product_name} (${item.product_sku}) - BOM: ${item.bom_count} adet - Versiyon: ${item.version_no} - Aktif: ${item.is_active}`);
  });

  // "ATLAS" veya "ÜÇLÜ" içeren ürünlerde BOM ara
  console.log('\n=== "ATLAS" VEYA "ÜÇLÜ" İÇEREN ÜRÜNLERDE BOM ===');
  const atlasBom = db.prepare(`
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.sku as product_sku,
      COUNT(b.id) as bom_count
    FROM products p
    JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    WHERE (LOWER(p.name) LIKE '%atlas%' OR LOWER(p.name) LIKE '%üçlü%' OR LOWER(p.name) LIKE '%uclu%')
    GROUP BY p.id, p.name, p.sku
    ORDER BY p.name
  `).all();
  
  if (atlasBom.length > 0) {
    console.log(`Bulunan ${atlasBom.length} ürün:\n`);
    atlasBom.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product_name} (${item.product_sku}) - BOM: ${item.bom_count} adet`);
    });
  } else {
    console.log('Hiçbir "ATLAS" veya "ÜÇLÜ" içeren ürün için BOM bulunamadı!');
  }

  // Tüm ürünleri listele (BOM'u olan ve olmayan)
  console.log('\n=== TÜM ÜRÜNLER (BOM DURUMU İLE) ===');
  const allProducts = db.prepare(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      COUNT(b.id) as bom_count
    FROM products p
    LEFT JOIN bom b ON p.id = b.product_id AND b.deleted_at IS NULL
    LEFT JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
    GROUP BY p.id, p.name, p.sku
    ORDER BY bom_count DESC, p.name
    LIMIT 20
  `).all();
  
  console.log('İlk 20 ürün (BOM sayısına göre):\n');
  allProducts.forEach((item, index) => {
    console.log(`${index + 1}. ${item.name} (${item.sku}) - BOM: ${item.bom_count} adet`);
  });

} catch (error) {
  console.error('Hata:', error);
} finally {
  db.close();
}
