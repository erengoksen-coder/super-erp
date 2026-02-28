const Database = require('better-sqlite3');
const db = new Database('data/erp.db');
const products = db.prepare("SELECT id, name FROM products WHERE name LIKE '%Atlas Berjer%'").all();
for (const p of products) {
    console.log(`--- Items for ${p.name} ---`);
    const items = db.prepare(`
        SELECT b.id, m.name as mat_name, b.quantity_required, b.waste_percentage, m.unit_price, m.purchase_price
        FROM bom b 
        JOIN materials m ON m.id = b.material_id 
        JOIN bom_versions bv ON bv.id = b.version_id
        WHERE b.product_id = ? AND bv.is_active = 1
    `).all(p.id);
    items.forEach(it => {
        const cost = it.unit_price * (it.quantity_required * (1 + (it.waste_percentage || 0) / 100));
        console.log(`${it.mat_name}: Qty=${it.quantity_required}, Waste=${it.waste_percentage}%, Price=${it.unit_price} => Cost=${cost}`);
    });
}
