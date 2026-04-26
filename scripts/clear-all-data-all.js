#!/usr/bin/env node

const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync } = require('fs')
const { Client } = require('pg')

const SAFE_FLAG = String(process.env.ALLOW_DB_RESET || '').toLowerCase() === 'true'
const MODE = process.argv.includes('--yes')

if (!SAFE_FLAG || !MODE) {
  console.error('Bu işlem TÜM veriyi silecektir. Devam etmek için: ALLOW_DB_RESET=true node scripts/clear-all-data-all.js --yes')
  process.exit(1)
}

async function clearSqlite() {
  const dbPath = join(process.cwd(), 'data', 'erp.db')
  if (!existsSync(dbPath)) {
    console.warn('SQLite veritabanı bulunamadı:', dbPath)
    return
  }

  const db = new Database(dbPath)
  try {
    db.pragma('foreign_keys = OFF')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name)

    const deleteStmt = db.transaction(() => {
      for (const name of tables) {
        db.prepare(`DELETE FROM ${name}`).run()
      }
      try {
        db.exec('DELETE FROM sqlite_sequence')
      } catch {}
    })

    deleteStmt()
    console.log(`SQLite temizlendi. Silinen tablolar: ${tables.length}`)
  } finally {
    db.close()
  }
}

async function clearSupabase() {
  const connString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL
  if (!connString) {
    console.warn('SUPABASE_DB_URL veya SUPABASE_DATABASE_URL yok, Supabase temizliği atlandı.')
    return
  }

  const sslDisabled = String(process.env.SUPABASE_DB_SSL || '').toLowerCase() === 'false'
  const client = new Client({
    connectionString: connString,
    ...(sslDisabled ? {} : { ssl: { rejectUnauthorized: false } }),
  })

  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `)

    const keep = new Set(['supabase_migrations', 'schema_migrations'])
    const tables = rows.map((r) => r.tablename).filter((name) => !keep.has(name))

    if (tables.length === 0) {
      console.log('Supabase: Silinecek tablo yok.')
      return
    }

    await client.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`)
    console.log(`Supabase temizlendi. Silinen tablolar: ${tables.length}`)
  } finally {
    await client.end()
  }
}

async function run() {
  await clearSqlite()
  await clearSupabase()
}

run().catch((error) => {
  console.error('Temizlik başarısız:', error.message)
  process.exit(1)
})
