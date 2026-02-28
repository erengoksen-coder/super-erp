const Database = require('better-sqlite3');
const db = new Database('data/erp.db');

try {
    const columns = db.prepare("PRAGMA table_info(products)").all();
    console.log('Products columns:', columns.map(c => c.name));

    const ticketsTable = db.prepare("SELECT name FROM sqlite_master WHERE name='service_tickets'").get();
    console.log('Service tickets table:', !!ticketsTable);

} catch (e) {
    console.error('Error:', e.message);
}
db.close();
