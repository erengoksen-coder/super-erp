const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

/**
 * Livasofa ERP Automated Backup Scheduler
 * Runs the database backup script every day at 03:00 AM.
 * Keeps the system synchronized and secure.
 */

console.log('🚀 Livasofa ERP Backup Scheduler Started');
console.log('📅 Schedule: Every day at 03:00 AM');

// Environment variables or absolute path to node
const nodePath = 'node'; // Assumes node is in PATH, or provide absolute path

// 0 3 * * * = 03:00 AM every day
cron.schedule('0 3 * * *', () => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] 🔄 Initiating automated scheduled backup...`);
  
  const backupScript = path.join(__dirname, 'backup.js');
  
  exec(`node "${backupScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Scheduled backup FAILED: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Backup stderr: ${stderr}`);
    }
    console.log(`✅ Scheduled backup SUCCESS: ${stdout}`);
  });
});

// Run a test backup immediately (optional, or comment out)
console.log('ℹ️ To run a manual backup, use: node scripts/backup.js');

// Keep the process alive
process.stdin.resume();
