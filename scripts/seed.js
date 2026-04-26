/**
 * Super ERP - Database Seeding Script
 * Populates the local SQLite database with initial sample data for development.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/erp.db';
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

const seed = () => {
    console.log('🌱 Starting database seeding...');

    // Since our db.ts handles table creation on startup, 
    // we can assume tables exist if the app has run once.
    // Otherwise, we can run the initializeDatabase logic here too.
    
    // For now, let's just insert some core data.
    try {
        db.transaction(() => {
            // 1. Companies
            db.prepare('INSERT OR IGNORE INTO companies (id, name) VALUES (?, ?)').run('comp_01', 'Liva Sofa A.Ş.');
            
            // 2. Warehouses
            db.prepare('INSERT OR IGNORE INTO warehouses (id, code, name, company_id) VALUES (?, ?, ?, ?)').run('wh_01', 'ANA-001', 'Ana Üretim Deposu', 'comp_01');

            // 3. Materials
            const insertMaterial = db.prepare(`
                INSERT OR IGNORE INTO materials (id, code, name, category, unit, stock_amount, company_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertMaterial.run('mat_01', 'KMS-001', 'Gri Kadife Kumaş', 'Kumaş', 'm', 500, 'comp_01');
            insertMaterial.run('mat_02', 'SNG-001', '32 Dansite Sünger', 'Sünger', 'adet', 120, 'comp_01');
            insertMaterial.run('mat_03', 'ISK-001', 'Gürgen İskelet Modeli A', 'İskelet', 'adet', 45, 'comp_01');

            // 4. Products (Furniture)
            const insertProduct = db.prepare(`
                INSERT OR IGNORE INTO products (id, name, sku, price, selling_price, stock_amount, company_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertProduct.run('prod_01', 'Chester Koltuk Takımı', 'CHST-001', 12000, 24500, 5, 'comp_01');
            insertProduct.run('prod_02', 'Modern Berjer', 'BRJ-002', 3500, 7200, 10, 'comp_01');

            // 5. Accounts (Dealers & Suppliers)
            const insertAccount = db.prepare(`
                INSERT OR IGNORE INTO accounts (id, code, name, type, company_id)
                VALUES (?, ?, ?, ?, ?)
            `);
            insertAccount.run('acc_01', 'BY-001', 'İstanbul Mobilya Sarayı (Bayi)', 'customer', 'comp_01');
            insertAccount.run('acc_02', 'BY-002', 'Ankara Tasarım Dünyası (Bayi)', 'customer', 'comp_01');
            insertAccount.run('acc_03', 'TED-001', 'Güney Kumaşçılık (Tedarikçi)', 'supplier', 'comp_01');

            console.log('✅ Core entities seeded.');
        })();
    } catch (err: any) {
        console.error('❌ Seeding failed:', err.message);
    }

    db.close();
    console.log('🌱 Seeding process finished.');
};

seed();
