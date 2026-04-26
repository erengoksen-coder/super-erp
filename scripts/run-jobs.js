#!/usr/bin/env node

const { existsSync, mkdirSync } = require('fs')
const { join } = require('path')
const Database = require('better-sqlite3')

const DATA_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DATA_DIR, 'erp.db')

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

function openDatabase() {
  ensureDataDir()
  const db = new Database(DB_PATH)
  try {
    db.pragma('journal_mode = WAL')
  } catch {}
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = OFF')
  return db
}

function cleanupExpiredSessions(db) {
  const now = new Date().toISOString()
  const result = db.prepare(`
    DELETE FROM user_sessions
    WHERE (expires_at IS NOT NULL AND expires_at < ?)
       OR revoked_at IS NOT NULL
  `).run(now)
  return result.changes || 0
}

function cleanupOldAuditLogs(db, days = 90) {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const result = db.prepare(`
    DELETE FROM audit_logs
    WHERE created_at < ?
  `).run(threshold)
  return result.changes || 0
}

function runOnce() {
  const db = openDatabase()
  try {
    const sessionCount = cleanupExpiredSessions(db)
    const auditCount = cleanupOldAuditLogs(db)
    console.log(`[jobs] cleaned sessions=${sessionCount} audit_logs=${auditCount}`)
  } finally {
    db.close()
  }
}

const watch = process.argv.includes('--watch')
const intervalMs = Number(process.env.JOB_INTERVAL_MS || 300000)

runOnce()

if (watch) {
  console.log(`[jobs] watch mode enabled (interval ${intervalMs}ms)`)
  setInterval(runOnce, intervalMs)
}
