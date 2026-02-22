const Database = require('better-sqlite3')
const { existsSync } = require('fs')
const { join } = require('path')

// Tek dosya data/erp.db (lib/database/db.ts ile aynı)
function getDbPath() {
  return join(process.cwd(), 'data', 'erp.db')
}

function assertDbExists() {
  const dbPath = getDbPath()
  if (!existsSync(dbPath)) {
    console.log('Veritabani dosyasi bulunamadi:', dbPath)
    process.exit(0)
  }
  return dbPath
}

function ensureDangerousAllowed(scriptName) {
  if (process.env.ALLOW_DB_RESET === 'true') return
  console.log(`\n[GUVENTLIK] ${scriptName} calistirilmadi.`)
  console.log('Bu script tehlikeli islemler yapiyor.')
  console.log('Calistirmak icin: setx ALLOW_DB_RESET true (sonra terminali yenile)')
  process.exit(1)
}

// path verilirse onu aç, verilmezse assertDbExists() ile bulunan path kullan (uygulama ile aynı DB)
function openDatabase(pathOrUndefined) {
  const dbPath = pathOrUndefined != null ? pathOrUndefined : assertDbExists()
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  return db
}

module.exports = {
  getDbPath,
  assertDbExists,
  ensureDangerousAllowed,
  openDatabase,
}
