import { getDatabase } from './lib/database/db';
const db = getDatabase();
try {
    const result = db.prepare("UPDATE notifications SET type='info' WHERE type NOT IN ('info', 'warning', 'error', 'success') OR type IS NULL").run();
    console.log('Fixed types:', result.changes);
} catch (e) { console.error(e); }
