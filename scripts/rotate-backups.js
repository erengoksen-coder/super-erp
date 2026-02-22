#!/usr/bin/env node
/**
 * data/backups/ içindeki yedekleri rotasyona tabi tutar.
 * Kullanım:
 *   node scripts/rotate-backups.js [--days=7]     → 7 günden eski yedekleri siler
 *   node scripts/rotate-backups.js [--keep=10]   → En son 10 yedeği tutar, eskileri siler
 *   Her iki parametre verilirse önce --keep uygulanır, kalan dosyalarda --days uygulanır.
 * Öneri: backup-database.js sonrası veya cron ile çalıştırın.
 */

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const backupDir = path.join(projectRoot, 'data', 'backups')

const args = process.argv.slice(2)
let keepDays = 7
let keepCount = 0
for (const arg of args) {
  if (arg.startsWith('--days=')) {
    keepDays = Math.max(1, parseInt(arg.slice(7), 10) || 7)
  } else if (arg.startsWith('--keep=')) {
    keepCount = Math.max(1, parseInt(arg.slice(7), 10) || 10)
  }
}

if (!fs.existsSync(backupDir)) {
  console.log('Yedek klasörü yok, atlanıyor:', backupDir)
  process.exit(0)
}

const files = fs.readdirSync(backupDir)
  .map((name) => ({ name, path: path.join(backupDir, name), mtimeMs: fs.statSync(path.join(backupDir, name)).mtimeMs }))
  .filter((f) => fs.statSync(f.path).isFile())
  .sort((a, b) => b.mtimeMs - a.mtimeMs) // yeniden eskiye

let removed = 0

if (keepCount > 0 && files.length > keepCount) {
  const toRemove = files.slice(keepCount)
  for (const f of toRemove) {
    try {
      fs.unlinkSync(f.path)
      console.log('Silindi (--keep):', f.name)
      removed++
    } catch (e) {
      console.error('Silinemedi:', f.name, e.message)
    }
  }
}

if (keepDays > 0) {
  const now = Date.now()
  const maxAgeMs = keepDays * 24 * 60 * 60 * 1000
  const afterKeep = fs.readdirSync(backupDir)
    .map((name) => ({ name, path: path.join(backupDir, name), mtimeMs: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .filter((f) => fs.statSync(f.path).isFile())
  for (const f of afterKeep) {
    if (now - f.mtimeMs > maxAgeMs) {
      try {
        fs.unlinkSync(f.path)
        console.log('Silindi (--days):', f.name)
        removed++
      } catch (e) {
        console.error('Silinemedi:', f.name, e.message)
      }
    }
  }
}

console.log('Rotasyon tamamlandı. Silinen:', removed, 'dosya.')
