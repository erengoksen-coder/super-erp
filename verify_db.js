const Database = require('better-sqlite3');
const db = new Database('data/erp.db');

try {
    console.log('--- TABLE INFO: service_tickets ---');
    const columns = db.prepare("PRAGMA table_info(service_tickets)").all();
    columns.forEach(c => console.log(`${c.name} (${c.type})`));

    console.log('\n--- SAMPLE DATA FROM users ---');
    const user = db.prepare("SELECT id, name, dealer_name FROM users WHERE dealer_name IS NOT NULL LIMIT 5").all();
    console.log(JSON.stringify(user, null, 2));

    console.log('\n--- SAMPLE DATA FROM accounts ---');
    const accountNames = user.map(u => u.dealer_name);
    if (accountNames.length > 0) {
        const placeHolders = accountNames.map(() => '?').join(',');
        const accounts = db.prepare(`SELECT id, name FROM accounts WHERE name IN (${placeHolders})`).all(...accountNames);
        console.log(JSON.stringify(accounts, null, 2));
    }

} catch (e) {
    console.error('Error:', e.message);
}
db.close();
