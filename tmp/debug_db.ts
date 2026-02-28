import { getDatabase } from './lib/database/db'

const db = getDatabase();
try {
    const users = db.prepare("SELECT id, full_name, role, dealer_name FROM users").all();
    console.log("Users:", users);

    const accounts = db.prepare("SELECT id, name, type FROM accounts").all();
    console.log("Accounts:", accounts);

    const productsCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
    console.log("Products count:", productsCount);

    const bomCount = db.prepare("SELECT COUNT(*) as count FROM bom").get();
    console.log("BOM count:", bomCount);

    const activeBomVersions = db.prepare("SELECT id, product_id, is_active FROM bom_versions").all();
    console.log("BOM Versions:", activeBomVersions);

} catch (e) {
    console.error(e);
}
process.exit(0);
