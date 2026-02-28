const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'erp.db');
console.log('Using database:', dbPath);

const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name).join(', '));

    if (tables.some(t => t.name === 'service_tickets')) {
        const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='service_tickets'").get();
        console.log('Service Tickets Schema:', schema.sql);

        const count = db.prepare("SELECT COUNT(*) as count FROM service_tickets").get();
        console.log('Ticket Count:', count.count);

        // Check some sample data
        const sample = db.prepare("SELECT * FROM service_tickets LIMIT 1").get();
        console.log('Sample Ticket:', sample);
    } else {
        console.log('service_tickets table DOES NOT EXIST');
    }
} catch (e) {
    console.error('Error:', e.message);
}
db.close();
