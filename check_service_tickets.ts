import { getDatabase } from './lib/database/db';

const db = getDatabase();
try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='service_tickets'").get();
    console.log('Service Tickets Table Schema:', schema);

    if (schema) {
        const columns = db.prepare("PRAGMA table_info(service_tickets)").all();
        console.log('Columns:', columns);
    } else {
        console.log('Table service_tickets DOES NOT EXIST');
    }
} catch (e) {
    console.error('Error:', (e as any).message);
}
process.exit(0);
