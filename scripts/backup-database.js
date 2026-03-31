const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const dbPath = path.join(rootDir, 'database.db');
const backupsDir = path.join(rootDir, 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function formatDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`;
}

const timestamp = formatDate(new Date());
const backupFileName = `erp_${timestamp}.db`;
const backupFilePath = path.join(backupsDir, backupFileName);

try {
  if (!fs.existsSync(dbPath)) {
      console.error(`Kaynak veritabanı bulunamadı: ${dbPath}`);
      process.exit(1);
  }
  fs.copyFileSync(dbPath, backupFilePath);
  console.log(`Veritabanı başarıyla yedeklendi: ${backupFilePath}`);
} catch (err) {
  console.error('Yedekleme sırasında hata oluştu:', err);
  process.exit(1);
}
