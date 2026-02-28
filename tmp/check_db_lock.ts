import { getDatabase } from '../lib/database/db';

try {
    console.log('Checking database...');
    const db = getDatabase();
    const row = db.prepare('SELECT 1').get();
    console.log('Database is accessible:', row);
    process.exit(0);
} catch (error) {
    console.error('Database access failed:', error);
    process.exit(1);
}
