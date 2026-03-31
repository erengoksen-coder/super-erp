const fs = require('fs');
const path = require('path');

const backupDir = path.join(process.cwd(), 'backups');
// Okuma: env değişkeni (gün sayısı), varsayılan 7
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS || '7', 10);

if (!fs.existsSync(backupDir)) {
    console.log(`Yedek klasörü bulunamadı: ${backupDir}`);
    process.exit(0);
}

const files = fs.readdirSync(backupDir);
const now = Date.now();
const msInDay = 24 * 60 * 60 * 1000;

let deletedCount = 0;

for (const file of files) {
  if (file.startsWith('erp_') && file.endsWith('.db')) {
    const filePath = path.join(backupDir, file);
    try {
        const stats = fs.statSync(filePath);
        // Dosyanın yaşı (gün)
        const ageDays = (now - stats.mtime.getTime()) / msInDay;
        
        if (ageDays > KEEP_DAYS) {
            fs.unlinkSync(filePath);
            console.log(`Silindi (Rotasyon): ${file} (${Math.round(ageDays)} günlük)`);
            deletedCount++;
        }
    } catch (err) {
        console.error(`${file} silinirken hata:`, err.message);
    }
  }
}

console.log(`Rotasyon tamamlandı. ${deletedCount} eski yedek silindi (Saklama süresi: ${KEEP_DAYS} gün).`);
