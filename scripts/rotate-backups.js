#!/usr/bin/env node
/**
 * data/backups/ içindeki 7 günden eski yedekleri siler.
 * Kullanım: node scripts/rotate-backups.js [--days=7]
 * Öneri: backup-database.js sonrası veya cron ile çalıştırın.
 */

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const backupDir = path.join(projectRoot, 'data', 'backups')

const args = process.argv.slice(2)
let keepDays = 7
for (const arg of args) {
  if (arg.startsWith('--days=')) {
    keepDays = Math.max(1, parseInt(arg.slice(7), 10) || 7)
    break
  }
}

if (!fs.existsSync(backupDir)) {
  console.log('Yedek klasörü yok, atlanıyor:', backupDir)
  process.exit(0)
}

const now = Date.now()
const maxAgeMs = keepDays * 24 * 60 * 60 * 1000
const files = fs.readdirSync(backupDir)
let removed = 0

for (const name of files) {
  const filePath = path.join(backupDir, name)
  if (!fs.statSync(filePath).isFile()) continue
  const stat = fs.statSync(filePath)
  if (now - stat.mtimeMs > maxAgeMs) {
    try {
      fs.unlinkSync(filePath)
      console.log('Silindi:', name)
      removed++
    } catch (e) {
      console.error('Silinemedi:', name, e.message)
    }
  }
}

console.log('Rotasyon tamamlandı. Silinen:', removed, 'dosya. Tutulan süre:', keepDays, 'gün.')
