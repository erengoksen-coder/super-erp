const Database = require('better-sqlite3');
const db = new Database('data/erp.db');

try {
    // 1. Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='service_tickets'").get();
    console.log('Table exists:', !!tableExists);

    if (tableExists) {
        // 2. Check columns
        const columns = db.prepare("PRAGMA table_info(service_tickets)").all();
        console.log('Columns:', columns.map(c => c.name).join(', '));

        // 3. Try to run the query from the API
        // First find a sample dealer user
        const dealerUser = db.prepare("SELECT id, dealer_name FROM users WHERE dealer_name IS NOT NULL LIMIT 1").get();
        if (dealerUser) {
            console.log('Found dealer user:', dealerUser);
            let customerId = dealerUser.id;
            const account = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(dealerUser.dealer_name);
            if (account) {
                console.log('Found account for dealer:', account);
                customerId = account.id;
            } else {
                console.log('Account NOT FOUND for dealer name:', dealerUser.dealer_name);
            }

            try {
                const tickets = db.prepare(`
                    SELECT t.*, COALESCE(p.name, t.custom_product_name) as product_name
                    FROM service_tickets t
                    LEFT JOIN products p ON p.id = t.product_id
                    WHERE t.customer_id = ? AND t.company_id = ?
                    ORDER BY t.created_at DESC
                `).all(customerId, 'company_default');
                console.log('Query successful, tickets count:', tickets.length);
            } catch (err) {
                console.error('Query FAILED:', err.message);
            }
        } else {
            console.log('No dealer users found to test.');
        }
    }
} catch (e) {
    console.error('Test script failed:', e.message);
}
db.close();
