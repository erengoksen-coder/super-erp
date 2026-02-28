const db = require('better-sqlite3')('c:/super-erp/data/erp.db');
const orderId = 'a8b7fee4-7bcd-4a37-97d8-ba96efd9535a';
try {
    const order = db.prepare(`
            SELECT 
                id, status, created_at, order_number,
                (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count,
                (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = orders.id LIMIT 1) as first_product_name
            FROM orders 
            WHERE id = ? AND company_id = ? 
            AND (customer_id = ? OR (customer_id IS NULL AND dealer_name = ?))
        `).get(orderId, 'company_default', 'some_user_id', 'some_dealer_name');
    console.log(JSON.stringify(order));
} catch (e) {
    console.log('JSON_ERR: ' + e.message);
}
