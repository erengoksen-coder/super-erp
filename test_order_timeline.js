const db = require('better-sqlite3')('c:/super-erp/data/erp.db');
const orderId = '1133a6ac-cde2-4a9f-b4e4-c01d49065166';
try {
    const order = db.prepare('SELECT id, status, created_at, order_number FROM orders WHERE id = ?').get(orderId);
    console.log('Order without company check:', order);

    const orderWithCompany = db.prepare('SELECT id, status, created_at, order_number FROM orders WHERE id = ? AND company_id = ?').get(orderId, 'company_default');
    console.log('Order WITH company check:', orderWithCompany);

} catch (e) {
    console.error(e.message);
}
