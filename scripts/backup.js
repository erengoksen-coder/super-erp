const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Livasofa ERP Automated Backup System
 * This script performs a safe, point-in-time backup of the database.db file.
 */
function backup() {
  const rootDir = path.join(__dirname, '..');
  const dbPath = path.join(rootDir, 'database.db');
  const backupDir = path.join(rootDir, 'backups');
  
  // Create timestamp for filename
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .split('.')[0];
  
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✅ Backup directory created');
  }
  
  // Verify database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Source database not found at: ${dbPath}`);
    process.exit(1);
  }

  try {
    console.log('🔄 Starting point-in-time backup...');
    
    // Open database in readonly mode to ensure we don't interfere with the running app
    const db = new Database(dbPath, { readonly: true });
    
    // Perform asynchronous backup using better-sqlite3's built-in backup API
    db.backup(backupPath)
      .then(() => {
        console.log(`✅ Backup successfully created: ${backupPath}`);
        
        // Show file stats
        const stats = fs.statSync(backupPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📊 Backup Size: ${sizeMB} MB`);
        
        // Clean up backups older than 30 days
        cleanOldBackups(backupDir);
        
        db.close();
      })
      .catch(err => {
        console.error('❌ Backup failure:', err);
        db.close();
        process.exit(1);
      });
      
  } catch (error) {
    console.error('❌ Database connection failure:', error);
    process.exit(1);
  }
}

/**
 * Deletes backup files older than 30 days.
 */
function cleanOldBackups(backupDir) {
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  
  let deletedCount = 0;
  
  files.forEach(file => {
    if (!file.startsWith('backup-')) return;
    
    const filePath = path.join(backupDir, file);
    try {
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ Deleted legacy backup: ${file}`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not process file ${file}:`, e.message);
    }
  });
  
  if (deletedCount > 0) {
    console.log(`✅ Purged ${deletedCount} legacy backups.`);
  } else {
    console.log('ℹ️ No legacy backups identified for purging.');
  }
}

// Execute the backup operation
backup();
