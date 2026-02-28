// Fix inconsistent order statuses: production completed but order still in_production
const db = require('better-sqlite3')('./data/erp.db');

// Find orders where production is completed but order status is still in_production
const rows = db.prepare(`
  SELECT o.id, o.order_number, o.status as order_status, po.id as prod_id, po.status as prod_status, po.current_station
  FROM orders o
  JOIN production_orders po ON o.production_order_id = po.id
  WHERE (po.current_station = 'completed' OR po.status = 'completed')
    AND o.status = 'in_production'
    AND o.deleted_at IS NULL
`).all();

console.log('Inconsistent orders found:', rows.length);
rows.forEach(r => console.log(`  ${r.order_number}: order=${r.order_status}, prod=${r.prod_status}, station=${r.current_station}`));

if (rows.length > 0) {
    const now = new Date().toISOString();
    const result = db.prepare(`
    UPDATE orders SET status = 'completed', updated_at = ?
    WHERE production_order_id IN (
      SELECT po.id FROM production_orders po
      WHERE (po.current_station = 'completed' OR po.status = 'completed')
    )
    AND status = 'in_production'
    AND deleted_at IS NULL
  `).run(now);
    console.log('Fixed orders:', result.changes);
} else {
    console.log('No fix needed.');
}
