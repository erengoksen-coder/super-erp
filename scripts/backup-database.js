#!/usr/bin/env node
/**
 * Veritabanı yedeği alır: data/erp.db -> data/backups/erp_YYYY-MM-DD_HH-mm-ss.db
 * Kullanım: node scripts/backup-database.js
 */

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const dataDir = path.join(projectRoot, 'data')
const dbPath = path.join(dataDir, 'erp.db')
const backupDir = path.join(dataDir, 'backups')

if (!fs.existsSync(dbPath)) {
  console.error('Veritabanı bulunamadı:', dbPath)
  process.exit(1)
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
}

const now = new Date()
const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, (c) => (c === 'T' ? '_' : c))
const backupPath = path.join(backupDir, `erp_${stamp}.db`)

fs.copyFileSync(dbPath, backupPath)
console.log('Yedek oluşturuldu:', backupPath)
