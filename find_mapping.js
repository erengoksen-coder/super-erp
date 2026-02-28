const Database = require('better-sqlite3');
const db = new Database('data/erp.db');

try {
    const accounts = db.prepare("SELECT id, name FROM accounts WHERE name LIKE '%EREN%' COLLATE NOCASE").all();
    console.log('Accounts found:', accounts);

    const users = db.prepare("SELECT id, dealer_name FROM users").all();
    console.log('Users (all with dealer_name):', users.filter(u => u.dealer_name));

    // Check if tickets table exists and what's in it
    const ticketsCount = db.prepare("SELECT count(*) as count FROM service_tickets").get();
    console.log('Tickets count:', ticketsCount.count);

} catch (e) {
    console.error('Error:', e.message);
}
db.close();
