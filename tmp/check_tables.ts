import { getDatabase } from './lib/database/db';

const db = getDatabase();
try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_requests'").get();
    console.log('Purchase Requests Table Schema:', schema);

    const purchaseOrdersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='purchase_orders'").get();
    console.log('Purchase Orders Table Schema:', purchaseOrdersSchema);
} catch (e) {
    console.error('Error:', e.message);
}
