const db = require('better-sqlite3')('c:/super-erp/data/erp.db');

try {
    console.log('Testing Orders List Query...');
    const rows = db.prepare(`
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id LIMIT 1) as first_product_name,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_quantity
      FROM orders o
      WHERE (o.customer_id = ? OR (o.customer_id IS NULL AND o.dealer_name = ?)) 
        AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
  `).all('test', 'test');
    console.log('Orders List SUCCESS, rows:', rows.length);
} catch (e) {
    console.error('Orders List Error:', e.message);
}

try {
    console.log('Testing Timeline Query...');
    const order = db.prepare(`
      SELECT 
          id, status, created_at, order_number,
          (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count,
          (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = orders.id LIMIT 1) as first_product_name
      FROM orders 
      WHERE id = ? AND company_id = ? 
      AND (customer_id = ? OR (customer_id IS NULL AND dealer_name = ?))
  `).get('test', 'company_default', 'test', 'test');
    console.log('Timeline Query SUCCESS, order:', !!order);
} catch (e) {
    console.error('Timeline Query Error:', e.message);
}
