const Database = require('better-sqlite3');
const db = new Database('data/erp.db');
const products = db.prepare("SELECT id, name, sku, price, selling_price, dealer_price FROM products WHERE name LIKE '%Atlas Berjer%'").all();
console.log('Products:', JSON.stringify(products, null, 2));

for (const p of products) {
    const bomCost = db.prepare(`
        SELECT SUM(m.unit_price * (b.quantity_required * (1 + (COALESCE(b.waste_percentage, 0) / 100.0)))) as cost
        FROM bom b 
        JOIN materials m ON m.id = b.material_id 
        JOIN bom_versions bv ON bv.id = b.version_id
        WHERE b.product_id = ? AND b.deleted_at IS NULL AND bv.is_active = 1 AND bv.deleted_at IS NULL
    `).get(p.id);
    console.log(`BOM Cost for ${p.name}:`, bomCost.cost);
}
