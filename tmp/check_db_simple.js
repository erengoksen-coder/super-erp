const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(process.cwd(), 'data', 'erp.db');
    console.log('Opening DB at:', dbPath);
    const db = new Database(dbPath, { timeout: 1000 });
    db.pragma('journal_mode = WAL');
    const row = db.prepare('SELECT 1').get();
    console.log('Direct DB Check Result:', row);
    process.exit(0);
} catch (error) {
    console.error('Direct DB Check Failed:', error);
    process.exit(1);
}
