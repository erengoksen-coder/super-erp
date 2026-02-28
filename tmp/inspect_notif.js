const Database = require('better-sqlite3');
const db = new Database('./data/erp.db');

const notifs = db.prepare('SELECT id, user_id, type, title, is_read FROM notifications ORDER BY created_at DESC LIMIT 20').all();
console.log('Total notifications:', notifs.length);
notifs.forEach(n => console.log(JSON.stringify(n)));

const user = db.prepare("SELECT id, username, role FROM users WHERE username = 'eren'").get();
console.log('User eren:', JSON.stringify(user));

const erenNotifs = db.prepare("SELECT * FROM notifications WHERE user_id = ?").all(user.id);
console.log('Eren notifications count:', erenNotifs.length);
erenNotifs.forEach(n => console.log(JSON.stringify({ id: n.id, type: n.type, title: n.title, is_read: n.is_read })));
