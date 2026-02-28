import { getDatabase } from './lib/database/db';
const db = getDatabase();
try {
    const result = db.prepare("UPDATE notifications SET type='info'").run();
    console.log('Fixed types:', result.changes);
} catch (e) { console.error(e); }
