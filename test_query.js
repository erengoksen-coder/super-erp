const db = require('better-sqlite3')('c:/super-erp/data/erp.db');
try {
  const result = db.prepare(`
    SELECT o.id, (SELECT COALESCE(NULLIF(TRIM(oi.product_name), ''), (SELECT p.name FROM products p WHERE p.id = oi.product_id LIMIT 1)) FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) as first_product_name FROM orders o LIMIT 1
  `).get();
  console.log('Result:', result);
} catch (e) {
  console.error('ERROR:', e.message);
}
