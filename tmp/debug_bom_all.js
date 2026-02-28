const Database = require('better-sqlite3');
const db = new Database('data/erp.db');
const products = db.prepare("SELECT id, name FROM products WHERE name LIKE '%Atlas Berjer%'").all();
for (const p of products) {
    console.log(`--- ALL BOM Items for ${p.name} ---`);
    const items = db.prepare(`
        SELECT b.id, m.name as mat_name, b.quantity_required, b.waste_percentage, m.unit_price, b.version_id
        FROM bom b 
        LEFT JOIN materials m ON m.id = b.material_id 
        WHERE b.product_id = ?
    `).all(p.id);
    items.forEach(it => {
        console.log(`${it.mat_name}: Version=${it.version_id}, Qty=${it.quantity_required}, Price=${it.unit_price}`);
    });
}
